import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Capacidad, EstadoTransporte, Prioridad } from '../core/models';
import { Tone } from './badge';

const PRIORIDADES: Record<Prioridad, string> = { bajo: 'Baja', medio: 'Media', alto: 'Alta' };
const CAPACIDADES: Record<Capacidad, string> = {
  alto: 'Inventario alto',
  intermedio: 'Inventario intermedio',
  pocos: 'Pocos insumos',
  'sin insumos': 'Sin insumos',
};

export function etiquetaPrioridad(p: Prioridad | null): string {
  return p ? PRIORIDADES[p] : 'Sin prioridad';
}

export function toneDePrioridad(p: Prioridad | null): Tone {
  return p === 'alto' ? 'alta' : p === 'medio' ? 'media' : p === 'bajo' ? 'baja' : 'neutral';
}

export function etiquetaCapacidad(c: Capacidad | null): string {
  return c ? CAPACIDADES[c] : 'Sin dato';
}

export function toneDeCapacidad(c: Capacidad | null): Tone {
  return c === 'alto' ? 'baja' : c === 'intermedio' ? 'info' : c === 'pocos' ? 'media' : c === 'sin insumos' ? 'alta' : 'neutral';
}

/** Nivel de 0 a 4 para dibujar el medidor de inventario. */
export function nivelCapacidad(c: Capacidad | null): number {
  return c === 'alto' ? 4 : c === 'intermedio' ? 3 : c === 'pocos' ? 2 : c === 'sin insumos' ? 0 : 0;
}

export function toneDeTransporte(e: EstadoTransporte): Tone {
  return e === 'Entregado' ? 'baja' : e === 'En tránsito' ? 'media' : 'info';
}

/** Fragmento (#id) de la URL actual, para resaltar el elemento al que se enlazó. */
export function injectFragment() {
  return toSignal(inject(ActivatedRoute).fragment, { initialValue: null });
}
