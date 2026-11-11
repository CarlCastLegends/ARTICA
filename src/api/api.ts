import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import express, { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { Fila, ejecutar, todas, transaccion, una } from './db';

/* ---------- Configuración ---------- */

export const IMG_DIR = resolve(process.env['IMG_DIR'] ?? join(process.cwd(), 'img'));

/** Carpeta de imágenes por tabla. */
const TABLAS = {
  reg: { carpeta: 'reg', tabla: 'registrados', pk: 'id', porDefecto: 'https://placehold.co/400x400/e5e7eb/6b7280?text=Sin+foto' },
  afe: { carpeta: 'afe', tabla: 'afectado', pk: 'id', porDefecto: 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+afectada' },
  aco: { carpeta: 'aco', tabla: 'acopio', pk: 'id_acopio', porDefecto: 'https://placehold.co/600x400/e5e7eb/6b7280?text=Zona+de+acopio' },
} as const;
type ClaveFoto = keyof typeof TABLAS;

for (const t of Object.values(TABLAS)) mkdirSync(join(IMG_DIR, t.carpeta), { recursive: true });

/** Valores permitidos (equivalen a los enums de la base original). */
const PAISES = ['Venezuela', 'Colombia', 'Ecuador', 'Perú', 'Chile', 'Argentina', 'Brasil', 'México', 'Panamá', 'República Dominicana', 'Estados Unidos', 'España', 'Otro'];
const RECURSOS = ['Agua potable', 'Alimentos', 'Ropa', 'Cobijas/Colchonetas', 'Higiene personal', 'primeros auxilios', 'Herramientas', 'Bolsas de basura', 'Otro'];
const CAPACIDADES = ['alto', 'intermedio', 'pocos', 'sin insumos'];
const PRIORIDADES = ['bajo', 'medio', 'alto'];

/* ---------- Utilidades ---------- */

class ErrorHttp extends Error {
  constructor(readonly estado: number, mensaje: string) {
    super(mensaje);
  }
}

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30 },
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

function enumValido(valor: unknown, permitidos: readonly string[], campo: string): string {
  const v = texto(valor, campo, { max: 60 }) as string;
  if (!permitidos.includes(v)) throw new ErrorHttp(400, `Valor no válido para «${campo}».`);
  return v;
}

const AHORA = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

function json<T>(texto: unknown, porDefecto: T): T {
  if (typeof texto !== 'string') return porDefecto;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return porDefecto;
  }
}

function esImagenReal(buf: Buffer, mime: string): boolean {
  if (mime === 'image/png') return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/**
 * Foto opcional: archivo subido (se guarda en /img/<carpeta>) o enlace.
 * Devuelve `null` si no se envió nada (se usará la foto por defecto).
 */
function resolverFoto(req: Request, clave: ClaveFoto): string | null {
  const t = TABLAS[clave];
  if (req.file) {
    if (!esImagenReal(req.file.buffer, req.file.mimetype)) throw new ErrorHttp(400, 'El archivo no es una imagen válida.');
    const nombre = `${randomUUID()}${req.file.mimetype === 'image/png' ? '.png' : '.jpg'}`;
    writeFileSync(join(IMG_DIR, t.carpeta, nombre), req.file.buffer);
    return `/img/${t.carpeta}/${nombre}`;
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

/** Borra una foto previa solo si es un archivo propio dentro de /img/<carpeta>. */
function borrarFotoLocal(url: string | null | undefined, clave: ClaveFoto): void {
  const prefijo = `/img/${TABLAS[clave].carpeta}/`;
  if (!url?.startsWith(prefijo)) return;
  const ruta = resolve(IMG_DIR, TABLAS[clave].carpeta, url.slice(prefijo.length));
  if (ruta.startsWith(resolve(IMG_DIR) + sep) && existsSync(ruta)) unlinkSync(ruta);
}

/* ---------- Rutas ---------- */

export const api = Router();
api.use(express.json({ limit: '100kb' }));
api.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

api.get('/health', (_req, res) => {
  una('SELECT 1 AS ok');
  res.json({ ok: true });
});

api.get('/catalogos', (_req, res) => {
  res.json({
    paises: PAISES,
    recursos: RECURSOS,
    capacidades: CAPACIDADES,
    prioridades: PRIORIDADES,
    vehiculos: todas('SELECT id_vehiculo AS id, nombre, placa FROM vehiculo ORDER BY id_vehiculo'),
    inventario: todas('SELECT id_inventario AS id, nombre, tipo, cantidad FROM inventario ORDER BY id_inventario'),
  });
});

/* Zonas afectadas */
const SQL_AFECTADOS = `
  SELECT a.id, a.titulo, a.zona, a.foto, a.prioridad,
         a.poblacion_riesgo AS poblacionRiesgo, a.enlace_maps AS enlaceMaps,
         a.tipo_desastre AS tipoDesastre, a.magnitud, a.fecha_reporte AS fechaReporte, a.lat, a.lng
  FROM afectado a`;

api.get('/afectados', (_req, res) => {
  res.json(todas(`${SQL_AFECTADOS} ORDER BY a.fecha_reporte DESC, a.id DESC`));
});

api.post('/afectados', subida.single('foto'), (req, res) => {
  const b = cuerpo(req);
  const titulo = texto(b['titulo'], 'título', { max: 120 });
  const zona = texto(b['zona'], 'zona', { max: 120 }) as string;
  const prioridad = enumValido(b['prioridad'], PRIORIDADES, 'prioridad');
  const poblacion = entero(b['poblacionRiesgo'], 'población en riesgo', 0, 100000);
  const enlace = urlHttp(b['enlaceMaps'], 'enlace del mapa') ?? `https://www.openstreetmap.org/search?query=${encodeURIComponent(zona)}`;
  const tipo = texto(b['tipoDesastre'], 'tipo de desastre', { opcional: true, max: 60 });
  const magnitud = texto(b['magnitud'], 'magnitud', { opcional: true, max: 80 });
  const foto = resolverFoto(req, 'afe') ?? TABLAS.afe.porDefecto;
  const { id } = ejecutar(
    `INSERT INTO afectado (titulo, zona, foto, prioridad, poblacion_riesgo, enlace_maps, id_prioridad, tipo_desastre, magnitud)
     VALUES (?,?,?,?,?,?,(SELECT id_prioridad FROM prioridad WHERE nivel = ?),?,?)`,
    titulo, zona, foto, prioridad, poblacion, enlace, prioridad, tipo, magnitud,
  );
  res.status(201).json(una(`${SQL_AFECTADOS} WHERE a.id = ?`, id));
});

/* Zonas de acopio */
const SQL_ACOPIOS = `
  SELECT c.id_acopio AS id, c.titulo, c.zona, c.foto, c.recursos_comunes AS recursosJson, c.capacidad,
         c.enlace_maps AS enlaceMaps, c.lat, c.lng,
         i.id_inventario AS inventarioId, i.nombre AS inventarioNombre,
         i.tipo AS inventarioTipo, i.cantidad AS inventarioCantidad,
         v.nombre_completo AS responsable
  FROM acopio c
  LEFT JOIN inventario i ON i.id_inventario = c.id_inventario
  LEFT JOIN voluntario v ON v.id_voluntario = c.id_responsable`;

function acopio(f: Fila | undefined): Fila | undefined {
  if (!f) return f;
  const { recursosJson, ...resto } = f;
  return { ...resto, recursosComunes: json<string[]>(recursosJson, []) };
}

api.get('/acopios', (_req, res) => {
  res.json(todas(`${SQL_ACOPIOS} ORDER BY c.id_acopio`).map((f) => acopio(f)));
});

api.post('/acopios', subida.single('foto'), (req, res) => {
  const b = cuerpo(req);
  const titulo = texto(b['titulo'], 'título', { max: 120 });
  const zona = texto(b['zona'], 'zona', { max: 120 }) as string;
  const capacidad = enumValido(b['capacidad'], CAPACIDADES, 'capacidad');
  const recursos = lista(b['recursosComunes']).filter((x): x is string => typeof x === 'string' && RECURSOS.includes(x));
  const enlace = urlHttp(b['enlaceMaps'], 'enlace del mapa') ?? `https://www.openstreetmap.org/search?query=${encodeURIComponent(zona)}`;
  const idInventario = entero(b['idInventario'], 'inventario', 1, 2147483647, true);
  const foto = resolverFoto(req, 'aco') ?? TABLAS.aco.porDefecto;
  const { id } = ejecutar(
    `INSERT INTO acopio (titulo, zona, foto, recursos_comunes, capacidad, enlace_maps, id_inventario) VALUES (?,?,?,?,?,?,?)`,
    titulo, zona, foto, JSON.stringify(recursos), capacidad, enlace, idInventario,
  );
  res.status(201).json(acopio(una(`${SQL_ACOPIOS} WHERE c.id_acopio = ?`, id)));
});

/* Personas registradas (desaparecidas / encontradas) */
const SQL_REGISTRADOS = `
  SELECT r.id, r.nombre_completo AS nombreCompleto, r.cedula, r.edad, r.foto,
         CASE r.estado_persona WHEN 'desaparecido' THEN 'Desaparecida' ELSE 'Encontrada' END AS estado,
         r.id_zona AS idZona, a.titulo AS zonaTitulo, a.zona AS zona, r.fecha_reporte AS fechaReporte
  FROM registrados r
  LEFT JOIN afectado a ON a.id = r.id_zona`;

api.get('/registrados', (_req, res) => {
  res.json(todas(`${SQL_REGISTRADOS} ORDER BY r.fecha_reporte DESC, r.id DESC`));
});

api.post('/registrados', subida.single('foto'), (req, res) => {
  const b = cuerpo(req);
  const nombre = texto(b['nombreCompleto'], 'nombre completo', { max: 120 });
  const cedula = texto(b['cedula'], 'cédula', { max: 20 }) as string;
  if (!/^[VvEe]?-?\d{1,2}\.?\d{3}\.?\d{3}$/.test(cedula)) throw new ErrorHttp(400, 'Cédula con formato no válido (ej. V-12.345.678).');
  const edad = entero(b['edad'], 'edad', 0, 120);
  const estado = b['estado'] === 'Encontrada' || b['estado'] === 'encontrado' ? 'encontrado' : 'desaparecido';
  const idZona = entero(b['idZona'], 'zona', 1, 2147483647, true);
  const foto = resolverFoto(req, 'reg') ?? TABLAS.reg.porDefecto;
  const { id } = ejecutar(
    `INSERT INTO registrados (nombre_completo, cedula, foto, estado_persona, id_zona, edad) VALUES (?,?,?,?,?,?)`,
    nombre, cedula.toUpperCase(), foto, estado, idZona, edad,
  );
  res.status(201).json(una(`${SQL_REGISTRADOS} WHERE r.id = ?`, id));
});

api.patch('/registrados/:id/encontrado', (req, res) => {
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const r = ejecutar(`UPDATE registrados SET estado_persona = 'encontrado' WHERE id = ?`, id);
  if (!r.cambios) throw new ErrorHttp(404, 'No existe ese registro.');
  res.json(una(`${SQL_REGISTRADOS} WHERE r.id = ?`, id));
});

/* Entregas (transporte) */
const SQL_ENTREGAS = `
  SELECT e.id_entrega AS id, e.codigo, e.destino, e.origen, e.estado, e.cantidad_objetivo AS cantidad,
         e.id_acopio AS idAcopio, e.id_afectado AS idAfectado, p.nivel AS prioridad,
         e.fecha_salida AS fechaSalida, e.fecha_llegada AS fechaLlegada,
         v.nombre AS vehiculo, v.placa, v.id_conductor AS conductor,
         (SELECT json_group_array(json_object('nombre', i.nombre, 'tipo', i.tipo, 'cantidad', i.cantidad))
            FROM inventario i WHERE i.id_inventario IN (SELECT value FROM json_each(e.id_inventario))) AS cargaJson
  FROM entrega e
  LEFT JOIN vehiculo v ON v.id_vehiculo = e.id_vehiculo
  LEFT JOIN prioridad p ON p.id_prioridad = e.id_prioridad`;

function entrega(f: Fila | undefined): Fila | undefined {
  if (!f) return f;
  const { cargaJson, ...resto } = f;
  return { ...resto, carga: json<unknown[]>(cargaJson, []) };
}

api.get('/entregas', (_req, res) => {
  res.json(todas(`${SQL_ENTREGAS} ORDER BY e.fecha_salida DESC, e.id_entrega DESC`).map((f) => entrega(f)));
});

api.post('/entregas', (req, res) => {
  const b = cuerpo(req);
  const idAcopio = entero(b['idAcopio'], 'zona de acopio', 1, 2147483647) as number;
  const idAfectado = entero(b['idAfectado'], 'zona afectada', 1, 2147483647) as number;
  const idVehiculo = entero(b['idVehiculo'], 'vehículo', 1, 2147483647) as number;
  const cantidad = decimal(b['cantidadObjetivo'], 'cantidad', 0, 10000000);
  const inventario = lista(b['idInventario']).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const id = transaccion(() => {
    const ac = una('SELECT titulo FROM acopio WHERE id_acopio = ?', idAcopio);
    const af = una('SELECT zona, id_prioridad FROM afectado WHERE id = ?', idAfectado);
    if (!ac || !af) throw new ErrorHttp(400, 'La zona de acopio o la zona afectada no existe.');
    const nuevo = ejecutar(
      `INSERT INTO entrega (destino, origen, id_vehiculo, id_acopio, id_afectado, cantidad_objetivo, id_inventario, id_prioridad)
       VALUES (?,?,?,?,?,?,?,?)`,
      af['zona'] as string, ac['titulo'] as string, idVehiculo, idAcopio, idAfectado, cantidad, JSON.stringify(inventario), af['id_prioridad'] as number | null,
    );
    ejecutar(`UPDATE entrega SET codigo = 'ENT-' || printf('%03d', id_entrega) WHERE id_entrega = ?`, nuevo.id);
    return nuevo.id;
  });
  res.status(201).json(entrega(una(`${SQL_ENTREGAS} WHERE e.id_entrega = ?`, id)));
});

api.patch('/entregas/:id/estado', (req, res) => {
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const estado = cuerpo(req)['estado'];
  if (estado !== 'Preparando' && estado !== 'En tránsito' && estado !== 'Entregado') throw new ErrorHttp(400, 'Estado no válido.');
  const r = ejecutar(
    `UPDATE entrega SET estado = ?, fecha_llegada = CASE WHEN ? = 'Entregado' THEN ${AHORA} ELSE NULL END WHERE id_entrega = ?`,
    estado, estado, id,
  );
  if (!r.cambios) throw new ErrorHttp(404, 'No existe esa entrega.');
  res.json(entrega(una(`${SQL_ENTREGAS} WHERE e.id_entrega = ?`, id)));
});

/* Donadores y voluntarios */
api.get('/donadores', (_req, res) => {
  // No se expone el correo.
  res.json(
    todas(`
      SELECT d.id, d.nombre, d.recurso_donado AS recursosJson, d.dinero_donado AS dinero,
             d.pais, d.estado, d.id_acopio_donado AS idAcopio, c.titulo AS acopio
      FROM donador d LEFT JOIN acopio c ON c.id_acopio = d.id_acopio_donado
      ORDER BY d.id DESC`).map(({ recursosJson, ...resto }) => ({ ...resto, recursos: json<string[]>(recursosJson, []) })),
  );
});

api.post('/donadores', (req, res) => {
  const b = cuerpo(req);
  const nombre = texto(b['nombre'], 'nombre', { max: 120 });
  const correo = texto(b['correo'], 'correo', { max: 160 }) as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new ErrorHttp(400, 'Correo no válido.');
  const recursos = lista(b['recursos']).filter((x): x is string => typeof x === 'string' && RECURSOS.includes(x));
  const dinero = b['dinero'] === '' || b['dinero'] === undefined || b['dinero'] === null ? 0 : decimal(b['dinero'], 'dinero', 0, 100000000);
  if (!recursos.length && dinero <= 0) throw new ErrorHttp(400, 'Indica al menos un recurso o un monto en dinero.');
  const pais = enumValido(b['pais'], PAISES, 'país');
  const idAcopio = entero(b['idAcopio'], 'zona de acopio', 1, 2147483647) as number;
  const { id } = ejecutar(
    `INSERT INTO donador (nombre, correo, recurso_donado, dinero_donado, estado, pais, id_acopio_donado) VALUES (?,?,?,?,'pendiente',?,?)`,
    nombre, correo, recursos.length ? JSON.stringify(recursos) : null, dinero, pais, idAcopio,
  );
  res.status(201).json({ id, codigo: `DON-${String(id).padStart(4, '0')}` });
});

api.post('/voluntarios', (req, res) => {
  const b = cuerpo(req);
  const nombre = texto(b['nombreCompleto'], 'nombre completo', { max: 120 });
  const cedula = texto(b['cedula'], 'cédula', { max: 20 }) as string;
  if (!/^[VvEe]?-?\d{1,2}\.?\d{3}\.?\d{3}$/.test(cedula)) throw new ErrorHttp(400, 'Cédula con formato no válido (ej. V-12.345.678).');
  const idAcopio = entero(b['idAcopio'], 'zona de acopio', 1, 2147483647) as number;
  const { id } = ejecutar(`INSERT INTO voluntario (nombre_completo, cedula, id_acopio) VALUES (?,?,?)`, nombre, cedula.toUpperCase(), idAcopio);
  res.status(201).json({ id });
});

/* Coordenadas (las guarda el mapa tras geocodificar con OpenStreetMap) */
api.patch('/ubicacion/:tabla/:id', (req, res) => {
  const clave = req.params['tabla'];
  if (clave !== 'afe' && clave !== 'aco') throw new ErrorHttp(400, 'Tabla no válida.');
  const t = TABLAS[clave];
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const lat = decimal(cuerpo(req)['lat'], 'lat', -90, 90);
  const lng = decimal(cuerpo(req)['lng'], 'lng', -180, 180);
  const r = ejecutar(`UPDATE ${t.tabla} SET lat = ?, lng = ? WHERE ${t.pk} = ?`, lat, lng, id);
  if (!r.cambios) throw new ErrorHttp(404, 'No existe ese registro.');
  res.json({ ok: true });
});

/* Cambiar la foto de un registro existente (enlace o archivo) */
api.patch('/foto/:tabla/:id', subida.single('foto'), (req, res) => {
  const clave = req.params['tabla'];
  if (clave !== 'reg' && clave !== 'afe' && clave !== 'aco') throw new ErrorHttp(400, 'Tabla no válida.');
  const t = TABLAS[clave];
  const id = entero(req.params['id'], 'id', 1, 2147483647) as number;
  const nueva = resolverFoto(req, clave);
  if (!nueva) throw new ErrorHttp(400, 'Envía un archivo (.png, .jpg, .jpeg) o un enlace.');
  const anterior = una(`SELECT foto FROM ${t.tabla} WHERE ${t.pk} = ?`, id);
  if (!anterior) {
    borrarFotoLocal(nueva, clave);
    throw new ErrorHttp(404, 'No existe ese registro.');
  }
  ejecutar(`UPDATE ${t.tabla} SET foto = ? WHERE ${t.pk} = ?`, nueva, id);
  borrarFotoLocal(anterior['foto'] as string | null, clave);
  res.json({ foto: nueva });
});

/* ---------- Errores ---------- */

api.use((_req, _res, next) => next(new ErrorHttp(404, 'Ruta de la API no encontrada.')));

api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ErrorHttp) return void res.status(err.estado).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    return void res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'La foto supera los 5 MB.' : 'No se pudo leer la foto.' });
  }
  const e = err as { errcode?: number; message?: string };
  if (e.errcode === 2067 || e.errcode === 1555) return void res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  if (e.errcode === 787) return void res.status(400).json({ error: 'Referencia a un registro que no existe.' });
  if (e.errcode === 275 || e.errcode === 1299) return void res.status(400).json({ error: 'Algún dato no cumple las reglas de la base de datos.' });
  console.error('[API]', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});
