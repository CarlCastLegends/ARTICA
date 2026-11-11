import { Component, computed, input } from '@angular/core';
import { Capacidad } from '../core/models';
import { etiquetaCapacidad, nivelCapacidad } from './ui';

/** Medidor de 4 segmentos para el nivel de inventario de un acopio. */
@Component({
  selector: 'app-nivel',
  template: `
    @for (s of segmentos; track s) {
      <span class="seg" [class.seg--on]="s <= nivel()"></span>
    }
  `,
  host: { role: 'img', '[attr.aria-label]': '"Nivel de inventario: " + etiqueta()' },
  styles: `
    :host { display: flex; gap: 0.25rem; }
    .seg { flex: 1; height: 0.55rem; border-radius: 999px; background: var(--neutral-bg); }
    .seg--on { background: var(--teal); }
  `,
})
export class Nivel {
  readonly capacidad = input<Capacidad | null>(null);
  protected readonly segmentos = [1, 2, 3, 4];
  protected readonly nivel = computed(() => nivelCapacidad(this.capacidad()));
  protected readonly etiqueta = computed(() => etiquetaCapacidad(this.capacidad()));
}
