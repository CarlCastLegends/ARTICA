export type Prioridad = 'Alta' | 'Media' | 'Baja';
export type TipoDesastre = 'Sismo' | 'Inundación' | 'Deslizamiento' | 'Sequía';
export type TipoAcopio = 'Institución' | 'ONG' | 'Lugar comunitario';
export type DisponibilidadAcopio = 'Disponible' | 'Capacidad limitada' | 'Lleno';
export type EstadoTransporte = 'Preparando' | 'En tránsito' | 'Entregado';
export type EstadoPersona = 'Desaparecida' | 'Encontrada';
export type TipoAporte = 'Insumos' | 'Dinero' | 'Voluntariado';

export interface ZonaAfectada {
  readonly id: string;
  readonly titulo: string;
  readonly municipio: string;
  readonly tipo: TipoDesastre;
  /** Magnitud o intensidad expresada en la unidad propia del desastre. */
  readonly magnitud: string;
  readonly prioridad: Prioridad;
  readonly poblacionRiesgo: number;
  /** Fecha ISO con zona horaria. */
  readonly fecha: string;
  readonly descripcion: string;
  readonly lat: number;
  readonly lng: number;
}

export interface ItemInventario {
  readonly nombre: string;
  readonly cantidad: number;
  readonly unidad: string;
}

export interface ZonaAcopio {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoAcopio;
  readonly municipio: string;
  readonly responsable: string;
  readonly horario: string;
  /** Porcentaje de capacidad ocupada (0-100). */
  readonly capacidadUsada: number;
  readonly disponibilidad: DisponibilidadAcopio;
  readonly recibe: readonly string[];
  readonly inventario: readonly ItemInventario[];
  readonly lat: number;
  readonly lng: number;
}

export interface Despacho {
  readonly id: string;
  readonly codigo: string;
  readonly origenId: string;
  readonly destinoId: string;
  readonly vehiculo: string;
  readonly placa: string;
  readonly conductor: string;
  readonly carga: string;
  readonly cantidad: number;
  readonly unidad: string;
  readonly estado: EstadoTransporte;
  readonly salida: string;
  readonly llegada: string | null;
  /** Última posición reportada. */
  readonly lat: number;
  readonly lng: number;
}

export interface ReportePersona {
  readonly id: string;
  readonly nombre: string;
  readonly edad: number;
  readonly cedula: string;
  readonly estado: EstadoPersona;
  readonly municipio: string;
  readonly contacto: string;
  readonly fecha: string;
}

export interface Aporte {
  readonly codigo: string;
  readonly nombre: string;
  readonly correo: string;
  readonly tipo: TipoAporte;
  readonly acopioId: string;
  readonly detalle: string;
  readonly fecha: string;
}
