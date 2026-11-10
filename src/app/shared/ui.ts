import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DisponibilidadAcopio, EstadoTransporte, Prioridad } from '../core/models';
import { Tone } from './badge';

export function toneDePrioridad(p: Prioridad): Tone {
  return p === 'Alta' ? 'alta' : p === 'Media' ? 'media' : 'baja';
}

export function toneDeDisponibilidad(d: DisponibilidadAcopio): Tone {
  return d === 'Disponible' ? 'baja' : d === 'Capacidad limitada' ? 'media' : 'alta';
}

export function toneDeTransporte(e: EstadoTransporte): Tone {
  return e === 'Entregado' ? 'baja' : e === 'En tránsito' ? 'media' : 'info';
}

/** Fragmento (#id) de la URL actual, para resaltar el elemento al que se enlazó. */
export function injectFragment() {
  return toSignal(inject(ActivatedRoute).fragment, { initialValue: null });
}
