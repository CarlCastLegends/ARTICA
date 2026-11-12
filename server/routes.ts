import express, { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { ErrorHttp, ejecutar, todas, transaccion, una } from './db';
import { Carpeta, borrarFoto, guardarFoto } from './storage';

/** Tablas con foto: carpeta → tabla, clave primaria y foto por defecto (enlace con fondo gris). */
const TABLAS = {
  reg: { tabla: 'personas.registrados', pk: 'id', porDefecto: 'https://placehold.co/400x400/e5e7eb/6b7280?text=Sin+foto' },
  afe: { tabla: 'zona.afectado', pk: 'id', porDefecto: 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+afectada' },
  aco: { tabla: 'zona.acopio', pk: 'id_acopio', porDefecto: 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+de+acopio' },
} as const satisfies Record<Carpeta, { tabla: string; pk: string; porDefecto: string }>;

/** Vercel limita el cuerpo de una petición a 4,5 MB. */
const MAX_FOTO = 4 * 1024 * 1024;

/* ---------- Utilidades ---------- */

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FOTO, files: 1, fields: 30 },
  fileFilter: (_req, file, cb) => {
    if (['image/png', 'image/jpeg'].includes(file.mimetype)) cb(null, true);
    else cb(new ErrorHttp(400, 'La foto debe ser .png, .jpg o .jpeg.'));
  },
});

function texto(valor: unknown, campo: string, opciones: { max?: number; opcional?: boolean } = {}): string | null {
  const t = typeof valor === 'string' ? valor.trim() : '';
  if (!t) {
    if (opciones.opcional) return null;
    throw new ErrorHttp(400, `Falta el campo «${campo}».`);
  }
  if (t.length > (opciones.max ?? 200)) throw new ErrorHttp(400, `«${campo}» es demasiado largo.`);
  return t;
}

function urlHttp(valor: unknown, campo: string): string | null {
  const t = texto(valor, campo, { opcional: true, max: 500 });
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    return u.toString();
  } catch {
    throw new ErrorHttp(400, `«${campo}» debe ser un enlace http:// o https://.`);
  }
}

function entero(valor: unknown, campo: string, min: number, max: number, opcional = false): number | null {
  if (valor === undefined || valor === null || valor === '') {
    if (opcional) return null;
    throw new ErrorHttp(400, `Falta el campo «${campo}».`);
  }
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) throw new ErrorHttp(400, `«${campo}» debe ser un entero entre ${min} y ${max}.`);
  return n;
}

function decimal(valor: unknown, campo: string, min: number, max: number): number {
  const n = Number(valor);
  if (valor === '' || valor === null || valor === undefined || !Number.isFinite(n) || n < min || n > max) {
    throw new ErrorHttp(400, `«${campo}» debe ser un número entre ${min} y ${max}.`);
  }
  return n;
}

function lista(valor: unknown): unknown[] {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === 'string' && valor.trim()) {
    try {
      const v: unknown = JSON.parse(valor);
      return Array.isArray(v) ? v : [];
    } catch {
      return valor.split(',').map((s) => s.trim());
    }
  }
  return [];
}

function cuerpo(req: Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

async function valoresEnum(tipo: string): Promise<string[]> {
  return (await todas<{ v: string }>(`SELECT unnest(enum_range(NULL::${tipo}))::text AS v`)).map((x) => x.v);
}

async function enumValido(valor: unknown, tipo: string, campo: string): Promise<string> {
  const v = texto(valor, campo, { max: 60 }) as string;
  if (!(await valoresEnum(tipo)).includes(v)) throw new ErrorHttp(400, `Valor no válido para «${campo}».`);
  return v;
}

function esImagenReal(buf: Buffer, mime: string): boolean {
  if (mime === 'image/png') return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/**
 * Foto opcional: archivo subido (se guarda en la carpeta de la tabla) o enlace.
 * Devuelve `null` si no se envió nada (se usará la foto gris por defecto).
 */
async function resolverFoto(req: Request, carpeta: Carpeta): Promise<string | null> {
  if (req.file) {
    if (!esImagenReal(req.file.buffer, req.file.mimetype)) throw new ErrorHttp(400, 'El archivo no es una imagen válida.');
    return guardarFoto(carpeta, req.file.buffer, req.file.mimetype);
  }
  const enlace = texto(cuerpo(req)['fotoUrl'], 'fotoUrl', { opcional: true, max: 2000 });
  if (!enlace) return null;
  try {
    const u = new URL(enlace);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    return u.toString();
  } catch {
    throw new ErrorHttp(400, 'El enlace de la foto no es válido (debe empezar con http:// o https://).');
  }
}

/* ---------- Rutas ---------- */

export const api = Router();
api.use(express.json({ limit: '100kb' }));
api.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

api.get('/health', async (_req, res) => {
  await una('SELECT 1 AS ok');
  res.json({ ok: true });
});

api.get('/catalogos', async (_req, res) => {
  const [paises, recursos, capacidades, prioridades, vehiculos, inventario] = await Promise.all([
    valoresEnum('personas.pais_enum'),
    valoresEnum('recursos.recurso_enum'),
    valoresEnum('zona.capacidad_enum'),
    valoresEnum('zona.prioridad_enum'),
    todas('SELECT id_vehiculo AS id, nombre, placa FROM entrega.vehiculo ORDER BY id_vehiculo'),
    todas(`SELECT id_inventario AS id, nombre, tipo::text AS tipo, cantidad::float8 AS cantidad FROM recursos.inventario ORDER BY id_inventario`),
  ]);
  res.json({ paises, recursos, capacidades, prioridades, vehiculos, inventario });
});

/* Zonas afectadas */
const SQL_AFECTADOS = `
  SELECT a.id, a.titulo, a.zona, a.foto, a.prioridad::text AS prioridad,
         a.poblacion_riesgo AS "poblacionRiesgo", a.enlace_maps AS "enlaceMaps",
         a.tipo_desastre AS "tipoDesastre", a.magnitud, a.fecha_reporte AS "fechaReporte", a.lat, a.lng
  FROM zona.afectado a`;

api.get('/afectados', async (_req, res) => {
  res.json(await todas(`${SQL_AFECTADOS} ORDER BY a.fecha_reporte DESC, a.id DESC`));
});

api.post('/afectados', subida.single('foto'), async (req, res) => {
  const b = cuerpo(req);
  const titulo = texto(b['titulo'], 'título', { max: 120 });
  const zona = texto(b['zona'], 'zona', { max: 120 }) as string;
  const prioridad = await enumValido(b['prioridad'], 'zona.prioridad_enum', 'prioridad');
  const poblacion = entero(b['poblacionRiesgo'], 'población en riesgo', 0, 100000);
  const enlace = urlHttp(b['enlaceMaps'], 'enlace del mapa') ?? `https://www.openstreetmap.org/search?query=${encodeURIComponent(zona)}`;
  const tipo = texto(b['tipoDesastre'], 'tipo de desastre', { opcional: true, max: 60 });
  const magnitud = texto(b['magnitud'], 'magnitud', { opcional: true, max: 80 });
  const foto = (await resolverFoto(req, 'afe')) ?? TABLAS.afe.porDefecto;
  const nuevo = await una<{ id: number }>(
    `INSERT INTO zona.afectado (titulo, zona, foto, prioridad, poblacion_riesgo, enlace_maps, id_prioridad, tipo_desastre, magnitud)
     VALUES ($1,$2,$3,$4::zona.prioridad_enum,$5,$6,(SELECT id_prioridad FROM zona.prioridad WHERE nivel = $4::zona.prioridad_enum),$7,$8)
     RETURNING id`,
    [titulo, zona, foto, prioridad, poblacion, enlace, tipo, magnitud],
  );
  res.status(201).json(await una(`${SQL_AFECTADOS} WHERE a.id = $1`, [nuevo!.id]));
});

/* Zonas de acopio */
const SQL_ACOPIOS = `
  SELECT c.id_acopio AS id, c.titulo, c.zona, c.foto,
         COALESCE(c.recursos_comunes::text[], '{}') AS "recursosComunes", c.capacidad::text AS capacidad,
         c.enlace_maps AS "enlaceMaps", c.lat, c.lng,
         i.id_inventario AS "inventarioId", i.nombre AS "inventarioNombre",
         i.tipo::text AS "inventarioTipo", i.cantidad::float8 AS "inventarioCantidad",
         v.nombre_completo AS responsable
  FROM zona.acopio c
  LEFT JOIN recursos.inventario i ON i.id_inventario = c.id_inventario
  LEFT JOIN zona.voluntario v ON v.id_voluntario = c.id_responsable`;

api.get('/acopios', async (_req, res) => {
  res.json(await todas(`${SQL_ACOPIOS} ORDER BY c.id_acopio`));
});

api.post('/acopios', subida.single('foto'), async (req, res) => {
  const b = cuerpo(req);
  const titulo = texto(b['titulo'], 'título', { max: 120 });
  const zona = texto(b['zona'], 'zona', { max: 120 }) as string;
  const capacidad = await enumValido(b['capacidad'], 'zona.capacidad_enum', 'capacidad');
  const permitidos = await valoresEnum('recursos.recurso_enum');
  const recursos = lista(b['recursosComunes']).filter((x): x is string => typeof x === 'string' && permitidos.includes(x));
  const enlace = urlHttp(b['enlaceMaps'], 'enlace del mapa') ?? `https://www.openstreetmap.org/search?query=${encodeURIComponent(zona)}`;
  const idInventario = entero(b['idInventario'], 'inventario', 1, 2147483647, true);
  const foto = (await resolverFoto(req, 'aco')) ?? TABLAS.aco.porDefecto;
  const nuevo = await una<{ id: number }>(
    `INSERT INTO zona.acopio (titulo, zona, foto, recursos_comunes, capacidad, enlace_maps, id_inventario)
     VALUES ($1,$2,$3,$4::recursos.recurso_enum[],$5::zona.capacidad_enum,$6,$7) RETURNING id_acopio AS id`,
    [titulo, zona, foto, recursos, capacidad, enlace, idInventario],
  );
  res.status(201).json(await una(`${SQL_ACOPIOS} WHERE c.id_acopio = $1`, [nuevo!.id]));
});

/* Personas registradas (desaparecidas / encontradas) */
const SQL_REGISTRADOS = `
  SELECT r.id, r.nombre_completo AS "nombreCompleto", r.cedula, r.edad, r.foto,
         CASE r.estado_persona::text WHEN 'desaparecido' THEN 'Desaparecida' ELSE 'Encontrada' END AS estado,
         r.id_zona AS "idZona", a.titulo AS "zonaTitulo", a.zona AS zona, r.fecha_reporte AS "fechaReporte"
  FROM personas.registrados r
  LEFT JOIN zona.afectado a ON a.id = r.id_zona`;

api.get('/registrados', async (_req, res) => {
  res.json(await todas(`${SQL_REGISTRADOS} ORDER BY r.fecha_reporte DESC, r.id DESC`));
});

api.post('/registrados', subida.single('foto'), async (req, res) => {
  const b = cuerpo(req);
  const nombre = texto(b['nombreCompleto'], 'nombre completo', { max: 120 });
  const cedula = texto(b['cedula'], 'cédula', { max: 20 }) as string;
  if (!/^[VvEe]?-?\d{1,2}\.?\d{3}\.?\d{3}$/.test(cedula)) throw new ErrorHttp(400, 'Cédula con formato no válido (ej. V-12.345.678).');
  const edad = entero(b['edad'], 'edad', 0, 120);
  const estado = b['estado'] === 'Encontrada' || b['estado'] === 'encontrado' ? 'encontrado' : 'desaparecido';
  const idZona = entero(b['idZona'], 'zona', 1, 2147483647, true);
  const foto = (await resolverFoto(req, 'reg')) ?? TABLAS.reg.porDefecto;
  const nuevo = await una<{ id: number }>(
    `INSERT INTO personas.registrados (nombre_completo, cedula, foto, estado_persona, id_zona, edad)
     VALUES ($1,$2,$3,$4::personas.estado_persona_enum,$5,$6) RETURNING id`,
    [nombre, cedula.toUpperCase(), foto, estado, idZona, edad],
  );
  res.status(201).json(await una(`${SQL_REGISTRADOS} WHERE r.id = $1`, [nuevo!.id]));
});

api.patch('/registrados/:id/encontrado', async (req, res) => {
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const n = await ejecutar(`UPDATE personas.registrados SET estado_persona = 'encontrado' WHERE id = $1`, [id]);
  if (!n) throw new ErrorHttp(404, 'No existe ese registro.');
  res.json(await una(`${SQL_REGISTRADOS} WHERE r.id = $1`, [id]));
});

/* Entregas (transporte) */
const SQL_ENTREGAS = `
  SELECT e.id_entrega AS id, e.codigo, e.destino, e.origen, e.estado, e.cantidad_objetivo::float8 AS cantidad,
         e.id_acopio AS "idAcopio", e.id_afectado AS "idAfectado", p.nivel::text AS prioridad,
         e.fecha_salida AS "fechaSalida", e.fecha_llegada AS "fechaLlegada",
         v.nombre AS vehiculo, v.placa, v.id_conductor AS conductor,
         COALESCE((SELECT json_agg(json_build_object('nombre', i.nombre, 'tipo', i.tipo::text, 'cantidad', i.cantidad::float8))
                   FROM recursos.inventario i WHERE i.id_inventario = ANY(e.id_inventario)), '[]'::json) AS carga
  FROM entrega.entrega e
  LEFT JOIN entrega.vehiculo v ON v.id_vehiculo = e.id_vehiculo
  LEFT JOIN zona.prioridad p ON p.id_prioridad = e.id_prioridad`;

api.get('/entregas', async (_req, res) => {
  res.json(await todas(`${SQL_ENTREGAS} ORDER BY e.fecha_salida DESC, e.id_entrega DESC`));
});

api.post('/entregas', async (req, res) => {
  const b = cuerpo(req);
  const idAcopio = entero(b['idAcopio'], 'zona de acopio', 1, 2147483647) as number;
  const idAfectado = entero(b['idAfectado'], 'zona afectada', 1, 2147483647) as number;
  const idVehiculo = entero(b['idVehiculo'], 'vehículo', 1, 2147483647) as number;
  const cantidad = decimal(b['cantidadObjetivo'], 'cantidad', 0, 10000000);
  const inventario = lista(b['idInventario']).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const id = await transaccion(async (c) => {
    const ac = await c.query('SELECT titulo FROM zona.acopio WHERE id_acopio = $1', [idAcopio]);
    const af = await c.query('SELECT zona, id_prioridad FROM zona.afectado WHERE id = $1', [idAfectado]);
    if (!ac.rowCount || !af.rowCount) throw new ErrorHttp(400, 'La zona de acopio o la zona afectada no existe.');
    const sig = await c.query(`SELECT nextval(pg_get_serial_sequence('entrega.entrega','id_entrega')) AS id`);
    const nuevo = Number(sig.rows[0].id);
    await c.query(
      `INSERT INTO entrega.entrega (id_entrega, codigo, destino, origen, id_vehiculo, id_acopio, id_afectado, cantidad_objetivo, id_inventario, id_prioridad)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [nuevo, `ENT-${String(nuevo).padStart(3, '0')}`, af.rows[0].zona, ac.rows[0].titulo, idVehiculo, idAcopio, idAfectado, cantidad, inventario, af.rows[0].id_prioridad],
    );
    return nuevo;
  });
  res.status(201).json(await una(`${SQL_ENTREGAS} WHERE e.id_entrega = $1`, [id]));
});

api.patch('/entregas/:id/estado', async (req, res) => {
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const estado = cuerpo(req)['estado'];
  if (estado !== 'Preparando' && estado !== 'En tránsito' && estado !== 'Entregado') throw new ErrorHttp(400, 'Estado no válido.');
  const n = await ejecutar(
    `UPDATE entrega.entrega SET estado = $2::text, fecha_llegada = CASE WHEN $2::text = 'Entregado' THEN now() ELSE NULL END WHERE id_entrega = $1`,
    [id, estado],
  );
  if (!n) throw new ErrorHttp(404, 'No existe esa entrega.');
  res.json(await una(`${SQL_ENTREGAS} WHERE e.id_entrega = $1`, [id]));
});

/* Donadores y voluntarios */
api.get('/donadores', async (_req, res) => {
  // No se expone el correo.
  res.json(
    await todas(`
      SELECT d.id, d.nombre, COALESCE(d.recurso_donado::text[], '{}') AS recursos, d.dinero_donado::float8 AS dinero,
             d.pais::text AS pais, d.estado, d.id_acopio_donado AS "idAcopio", c.titulo AS "acopio"
      FROM personas.donador d LEFT JOIN zona.acopio c ON c.id_acopio = d.id_acopio_donado
      ORDER BY d.id DESC`),
  );
});

api.post('/donadores', async (req, res) => {
  const b = cuerpo(req);
  const nombre = texto(b['nombre'], 'nombre', { max: 120 });
  const correo = texto(b['correo'], 'correo', { max: 160 }) as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new ErrorHttp(400, 'Correo no válido.');
  const permitidos = await valoresEnum('recursos.recurso_enum');
  const recursos = lista(b['recursos']).filter((x): x is string => typeof x === 'string' && permitidos.includes(x));
  const dinero = b['dinero'] === '' || b['dinero'] === undefined || b['dinero'] === null ? 0 : decimal(b['dinero'], 'dinero', 0, 100000000);
  if (!recursos.length && dinero <= 0) throw new ErrorHttp(400, 'Indica al menos un recurso o un monto en dinero.');
  const pais = await enumValido(b['pais'], 'personas.pais_enum', 'país');
  const idAcopio = entero(b['idAcopio'], 'zona de acopio', 1, 2147483647) as number;
  const nuevo = await una<{ id: number }>(
    `INSERT INTO personas.donador (nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado)
     VALUES ($1,$2,$3::recursos.recurso_enum[],$4,'pendiente',$5::personas.pais_enum,$6) RETURNING id`,
    [nombre, correo, recursos.length ? recursos : null, dinero, pais, idAcopio],
  );
  res.status(201).json({ id: nuevo!.id, codigo: `DON-${String(nuevo!.id).padStart(4, '0')}` });
});

api.post('/voluntarios', async (req, res) => {
  const b = cuerpo(req);
  const nombre = texto(b['nombreCompleto'], 'nombre completo', { max: 120 });
  const cedula = texto(b['cedula'], 'cédula', { max: 20 }) as string;
  if (!/^[VvEe]?-?\d{1,2}\.?\d{3}\.?\d{3}$/.test(cedula)) throw new ErrorHttp(400, 'Cédula con formato no válido (ej. V-12.345.678).');
  const idAcopio = entero(b['idAcopio'], 'zona de acopio', 1, 2147483647) as number;
  const nuevo = await una<{ id: number }>(
    `INSERT INTO zona.voluntario (nombre_completo, cedula, id_acopio) VALUES ($1,$2,$3) RETURNING id_voluntario AS id`,
    [nombre, cedula.toUpperCase(), idAcopio],
  );
  res.status(201).json({ id: nuevo!.id });
});

/* Coordenadas (las guarda el mapa tras geocodificar con OpenStreetMap) */
api.patch('/ubicacion/:tabla/:id', async (req, res) => {
  const clave = req.params['tabla'];
  if (clave !== 'afe' && clave !== 'aco') throw new ErrorHttp(400, 'Tabla no válida.');
  const t = TABLAS[clave];
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const lat = decimal(cuerpo(req)['lat'], 'lat', -90, 90);
  const lng = decimal(cuerpo(req)['lng'], 'lng', -180, 180);
  const n = await ejecutar(`UPDATE ${t.tabla} SET lat = $2, lng = $3 WHERE ${t.pk} = $1`, [id, lat, lng]);
  if (!n) throw new ErrorHttp(404, 'No existe ese registro.');
  res.json({ ok: true });
});

/* Cambiar la foto de un registro existente (enlace o archivo) */
api.patch('/foto/:tabla/:id', subida.single('foto'), async (req, res) => {
  const clave = req.params['tabla'];
  if (clave !== 'reg' && clave !== 'afe' && clave !== 'aco') throw new ErrorHttp(400, 'Tabla no válida.');
  const t = TABLAS[clave];
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const nueva = await resolverFoto(req, clave);
  if (!nueva) throw new ErrorHttp(400, 'Envía un archivo (.png, .jpg, .jpeg) o un enlace.');
  const anterior = await una<{ foto: string | null }>(`SELECT foto FROM ${t.tabla} WHERE ${t.pk} = $1`, [id]);
  if (!anterior) {
    await borrarFoto(nueva, clave);
    throw new ErrorHttp(404, 'No existe ese registro.');
  }
  await ejecutar(`UPDATE ${t.tabla} SET foto = $2 WHERE ${t.pk} = $1`, [id, nueva]);
  await borrarFoto(anterior.foto, clave);
  res.json({ foto: nueva });
});

/* ---------- Errores ---------- */

api.use((_req, _res, next) => next(new ErrorHttp(404, 'Ruta de la API no encontrada.')));

api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ErrorHttp) return void res.status(err.estado).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    return void res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'La foto supera los 4 MB.' : 'No se pudo leer la foto.' });
  }
  const e = err as { code?: string; errors?: { code?: string }[]; message?: string };
  const codigo = e.code ?? e.errors?.[0]?.code;
  if (codigo === 'ECONNREFUSED' || codigo === 'ENOTFOUND' || codigo === 'ETIMEDOUT') {
    console.error('[API] Sin conexión con PostgreSQL:', e.message);
    return void res.status(503).json({ error: 'No hay conexión con la base de datos. Revisa DATABASE_URL.' });
  }
  if (codigo === '28P01' || codigo === '28000') {
    return void res.status(503).json({ error: 'La base de datos rechazó el usuario o la contraseña de DATABASE_URL.' });
  }
  if (codigo === '3D000') return void res.status(503).json({ error: 'La base de datos indicada en DATABASE_URL no existe.' });
  if (codigo === '42P01' || codigo === '3F000' || codigo === '42704') {
    console.error('[API] Faltan tablas:', e.message);
    return void res.status(503).json({ error: 'Faltan tablas en la base de datos. Ejecuta «npm run db:init» una vez.' });
  }
  if (codigo === '42703') {
    console.error('[API] Faltan columnas:', e.message);
    return void res.status(503).json({ error: 'Faltan columnas en la base de datos. Ejecuta «npm run db:init».' });
  }
  if (codigo === '23505') return void res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  if (codigo === '23503') return void res.status(400).json({ error: 'Referencia a un registro que no existe.' });
  if (codigo === '23514' || codigo === '22P02') return void res.status(400).json({ error: 'Algún dato no cumple las reglas de la base de datos.' });
  console.error('[API]', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});
