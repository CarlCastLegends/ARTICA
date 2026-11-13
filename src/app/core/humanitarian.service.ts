import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Acopio, Afectado, Catalogos, Donador, Entrega, EstadoTransporte, Registrado, TablaFoto } from './models';

/** Texto corto y legible a partir de lo que respondió el servidor. */
export function mensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const cuerpo = err.error as { error?: unknown; text?: unknown } | string | null;
    if (cuerpo && typeof cuerpo === 'object' && typeof cuerpo.error === 'string') return cuerpo.error;

    let ruta = 'la API';
    try {
      if (err.url) ruta = new URL(err.url).pathname;
    } catch {
      ruta = err.url ?? 'la API';
    }
    if (err.status === 0) {
      return 'No hay conexión con el servidor. En local, ¿está en marcha «npm start»? En internet, revisa tu conexión.';
    }
    // 200 pero no es JSON: casi siempre es la página del sitio devuelta en lugar de la API.
    if (err.status === 200) {
      return `La dirección ${ruta} devolvió una página web en lugar de datos: la API no está desplegada en este sitio (¿falta la carpeta api/ en Vercel?).`;
    }
    if (err.status === 404) {
      return `La API no existe en ${ruta} (error 404). En Vercel significa que la función de la carpeta api/ no se desplegó.`;
    }
    const texto = typeof cuerpo === 'string' ? cuerpo.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
    return `El servidor respondió con el error ${err.status} en ${ruta}${texto ? `: ${texto}` : ''}.`;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

@Service()
export class HumanitarianService {
  private readonly http = inject(HttpClient);

  private readonly _afectados = signal<readonly Afectado[]>([]);
  private readonly _acopios = signal<readonly Acopio[]>([]);
  private readonly _entregas = signal<readonly Entrega[]>([]);
  private readonly _registrados = signal<readonly Registrado[]>([]);
  private readonly _donadores = signal<readonly Donador[]>([]);
  private readonly _catalogos = signal<Catalogos | null>(null);

  readonly afectados = this._afectados.asReadonly();
  readonly acopios = this._acopios.asReadonly();
  readonly entregas = this._entregas.asReadonly();
  readonly registrados = this._registrados.asReadonly();
  readonly donadores = this._donadores.asReadonly();
  readonly catalogos = this._catalogos.asReadonly();

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  private readonly afectadoIndex = computed(() => new Map(this._afectados().map((a) => [a.id, a])));
  private readonly acopioIndex = computed(() => new Map(this._acopios().map((a) => [a.id, a])));

  readonly resumen = computed(() => {
    const afectados = this._afectados();
    const entregas = this._entregas();
    const personas = this._registrados();
    return {
      zonasAfectadas: afectados.length,
      prioridadAlta: afectados.filter((a) => a.prioridad === 'alto').length,
      poblacionRiesgo: afectados.reduce((t, a) => t + (a.poblacionRiesgo ?? 0), 0),
      acopios: this._acopios().length,
      acopiosConInsumos: this._acopios().filter((a) => a.capacidad !== 'sin insumos').length,
      enTransito: entregas.filter((e) => e.estado === 'En tránsito').length,
      entregados: entregas.filter((e) => e.estado === 'Entregado').length,
      desaparecidas: personas.filter((p) => p.estado === 'Desaparecida').length,
      encontradas: personas.filter((p) => p.estado === 'Encontrada').length,
      donaciones: this._donadores().length,
    };
  });

  afectadoPorId(id: number | null): Afectado | undefined {
    return id === null ? undefined : this.afectadoIndex().get(id);
  }

  acopioPorId(id: number | null): Acopio | undefined {
    return id === null ? undefined : this.acopioIndex().get(id);
  }

  async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [afectados, acopios, entregas, registrados, donadores, catalogos] = await Promise.all([
        this.get<Afectado[]>('/api/afectados'),
        this.get<Acopio[]>('/api/acopios'),
        this.get<Entrega[]>('/api/entregas'),
        this.get<Registrado[]>('/api/registrados'),
        this.get<Donador[]>('/api/donadores'),
        this.get<Catalogos>('/api/catalogos'),
      ]);
      this._afectados.set(afectados);
      this._acopios.set(acopios);
      this._entregas.set(entregas);
      this._registrados.set(registrados);
      this._donadores.set(donadores);
      this._catalogos.set(catalogos);
    } catch (err) {
      this.error.set(mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  async crearAfectado(datos: FormData): Promise<Afectado> {
    const nuevo = await firstValueFrom(this.http.post<Afectado>('/api/afectados', datos));
    this._afectados.update((l) => [nuevo, ...l]);
    return nuevo;
  }

  async crearAcopio(datos: FormData): Promise<Acopio> {
    const nuevo = await firstValueFrom(this.http.post<Acopio>('/api/acopios', datos));
    this._acopios.update((l) => [...l, nuevo]);
    return nuevo;
  }

  async crearRegistrado(datos: FormData): Promise<Registrado> {
    const nuevo = await firstValueFrom(this.http.post<Registrado>('/api/registrados', datos));
    this._registrados.update((l) => [nuevo, ...l]);
    return nuevo;
  }

  async marcarEncontrado(id: number): Promise<void> {
    const r = await firstValueFrom(this.http.patch<Registrado>(`/api/registrados/${id}/encontrado`, {}));
    this._registrados.update((l) => l.map((p) => (p.id === id ? r : p)));
  }

  async crearEntrega(datos: object): Promise<Entrega> {
    const nueva = await firstValueFrom(this.http.post<Entrega>('/api/entregas', datos));
    this._entregas.update((l) => [nueva, ...l]);
    return nueva;
  }

  async cambiarEstado(id: number, estado: EstadoTransporte): Promise<void> {
    const r = await firstValueFrom(this.http.patch<Entrega>(`/api/entregas/${id}/estado`, { estado }));
    this._entregas.update((l) => l.map((e) => (e.id === id ? r : e)));
  }

  async crearDonador(datos: object): Promise<{ id: number; codigo: string }> {
    const r = await firstValueFrom(this.http.post<{ id: number; codigo: string }>('/api/donadores', datos));
    this._donadores.set(await this.get<Donador[]>('/api/donadores'));
    return r;
  }

  async crearVoluntario(datos: object): Promise<void> {
    await firstValueFrom(this.http.post('/api/voluntarios', datos));
  }

  async cambiarFoto(tabla: TablaFoto, id: number, datos: FormData): Promise<string> {
    const { foto } = await firstValueFrom(this.http.patch<{ foto: string }>(`/api/foto/${tabla}/${id}`, datos));
    if (tabla === 'afe') this._afectados.update((l) => l.map((a) => (a.id === id ? { ...a, foto } : a)));
    else if (tabla === 'aco') this._acopios.update((l) => l.map((a) => (a.id === id ? { ...a, foto } : a)));
    else this._registrados.update((l) => l.map((r) => (r.id === id ? { ...r, foto } : r)));
    return foto;
  }

  async guardarUbicacion(tabla: 'afe' | 'aco', id: number, lat: number, lng: number): Promise<void> {
    await firstValueFrom(this.http.patch(`/api/ubicacion/${tabla}/${id}`, { lat, lng }));
    if (tabla === 'afe') this._afectados.update((l) => l.map((a) => (a.id === id ? { ...a, lat, lng } : a)));
    else this._acopios.update((l) => l.map((a) => (a.id === id ? { ...a, lat, lng } : a)));
  }

  private get<T>(url: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(url));
  }
}
