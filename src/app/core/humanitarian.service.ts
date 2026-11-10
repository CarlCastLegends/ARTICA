import { Service, computed, inject, signal } from '@angular/core';
import { Aporte, Despacho, EstadoPersona, ReportePersona, TipoAporte, ZonaAcopio, ZonaAfectada } from './models';
import { DESPACHOS, REPORTES_PERSONAS, ZONAS_ACOPIO, ZONAS_AFECTADAS } from './seed-data';
import { HttpClient } from '@angular/common/http';

export interface NuevoAporte {
  nombre: string;
  correo: string;
  tipo: TipoAporte;
  acopioId: string;
  detalle: string;
}

export interface NuevoReporte {
  nombre: string;
  edad: number;
  cedula: string;
  estado: EstadoPersona;
  municipio: string;
  contacto: string;
}

@Service()
export class HumanitarianService {
  private readonly _zonas = signal<readonly ZonaAfectada[]>(ZONAS_AFECTADAS);
  private readonly _acopios = signal<readonly ZonaAcopio[]>(ZONAS_ACOPIO);
  private readonly _despachos = signal<readonly Despacho[]>(DESPACHOS);
  private readonly _personas = signal<readonly ReportePersona[]>(REPORTES_PERSONAS);
  private readonly _aportes = signal<readonly Aporte[]>([]);

  /** Más reciente primero. */
  readonly zonas = computed(() => [...this._zonas()].sort((a, b) => b.fecha.localeCompare(a.fecha)));
  readonly acopios = this._acopios.asReadonly();
  readonly despachos = computed(() => [...this._despachos()].sort((a, b) => b.salida.localeCompare(a.salida)));
  readonly personas = computed(() => [...this._personas()].sort((a, b) => b.fecha.localeCompare(a.fecha)));
  readonly aportes = this._aportes.asReadonly();

  private readonly zonaIndex = computed(() => new Map(this._zonas().map((z) => [z.id, z])));
  private readonly acopioIndex = computed(() => new Map(this._acopios().map((a) => [a.id, a])));

  readonly resumen = computed(() => {
    const zonas = this._zonas();
    const despachos = this._despachos();
    const personas = this._personas();
    return {
      zonasActivas: zonas.length,
      prioridadAlta: zonas.filter((z) => z.prioridad === 'Alta').length,
      poblacionRiesgo: zonas.reduce((t, z) => t + z.poblacionRiesgo, 0),
      acopiosDisponibles: this._acopios().filter((a) => a.disponibilidad !== 'Lleno').length,
      enTransito: despachos.filter((d) => d.estado === 'En tránsito').length,
      entregados: despachos.filter((d) => d.estado === 'Entregado').length,
      desaparecidas: personas.filter((p) => p.estado === 'Desaparecida').length,
      encontradas: personas.filter((p) => p.estado === 'Encontrada').length,
    };
  });

  zonaPorId(id: string): ZonaAfectada | undefined {
    return this.zonaIndex().get(id);
  }

  acopioPorId(id: string): ZonaAcopio | undefined {
    return this.acopioIndex().get(id);
  }

  registrarAporte(datos: NuevoAporte): Aporte {
    const aporte: Aporte = {
      ...datos,
      codigo: `DON-${1001 + this._aportes().length}`,
      fecha: new Date().toISOString(),
    };
    this._aportes.update((lista) => [aporte, ...lista]);
    return aporte;
  }

  registrarPersona(datos: NuevoReporte): ReportePersona {
    const reporte: ReportePersona = {
      ...datos,
      id: `p${this._personas().length + 1}`,
      fecha: new Date().toISOString(),
    };
    this._personas.update((lista) => [reporte, ...lista]);
    return reporte;
  }
}
