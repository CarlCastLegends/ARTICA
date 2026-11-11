export type Prioridad = 'bajo' | 'medio' | 'alto';
export type Capacidad = 'alto' | 'intermedio' | 'pocos' | 'sin insumos';
export type EstadoTransporte = 'Preparando' | 'En tránsito' | 'Entregado';
export type EstadoPersona = 'Desaparecida' | 'Encontrada';
/** reg = personas.registrados · afe = zona.afectado · aco = zona.acopio */
export type TablaFoto = 'reg' | 'afe' | 'aco';

export interface Afectado {
  readonly id: number;
  readonly titulo: string;
  readonly zona: string | null;
  readonly foto: string | null;
  readonly prioridad: Prioridad | null;
  readonly poblacionRiesgo: number | null;
  readonly enlaceMaps: string;
  readonly tipoDesastre: string | null;
  readonly magnitud: string | null;
  readonly fechaReporte: string;
  readonly lat: number | null;
  readonly lng: number | null;
}

export interface Acopio {
  readonly id: number;
  readonly titulo: string;
  readonly zona: string | null;
  readonly foto: string | null;
  readonly recursosComunes: readonly string[];
  readonly capacidad: Capacidad | null;
  readonly enlaceMaps: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly inventarioId: number | null;
  readonly inventarioNombre: string | null;
  readonly inventarioTipo: string | null;
  readonly inventarioCantidad: number | null;
  readonly responsable: string | null;
}

export interface CargaItem {
  readonly nombre: string;
  readonly tipo: string;
  readonly cantidad: number;
}

export interface Entrega {
  readonly id: number;
  readonly codigo: string | null;
  readonly destino: string | null;
  readonly origen: string | null;
  readonly estado: EstadoTransporte;
  readonly cantidad: number;
  readonly idAcopio: number;
  readonly idAfectado: number | null;
  readonly prioridad: Prioridad | null;
  readonly fechaSalida: string;
  readonly fechaLlegada: string | null;
  readonly vehiculo: string | null;
  readonly placa: string | null;
  readonly conductor: string | null;
  readonly carga: readonly CargaItem[];
}

export interface Registrado {
  readonly id: number;
  readonly nombreCompleto: string;
  readonly cedula: string;
  readonly edad: number | null;
  readonly foto: string | null;
  readonly estado: EstadoPersona;
  readonly idZona: number | null;
  readonly zonaTitulo: string | null;
  readonly zona: string | null;
  readonly fechaReporte: string;
}

export interface Donador {
  readonly id: number;
  readonly nombre: string;
  readonly recursos: readonly string[];
  readonly dinero: number | null;
  readonly pais: string | null;
  readonly estado: string | null;
  readonly idAcopio: number | null;
  readonly acopio: string | null;
}

export interface Catalogos {
  readonly paises: readonly string[];
  readonly recursos: readonly string[];
  readonly capacidades: readonly string[];
  readonly prioridades: readonly string[];
  readonly vehiculos: readonly { id: number; nombre: string; placa: string }[];
  readonly inventario: readonly { id: number; nombre: string; tipo: string; cantidad: number }[];
}
