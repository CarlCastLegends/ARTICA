import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { TablaFoto } from '../core/models';

/** Imagen de un registro: si falla o no existe, muestra una imagen gris por defecto. */
@Component({
  selector: 'app-foto',
  imports: [NgOptimizedImage],
  template: `<img [ngSrc]="origen()" [width]="ancho()" [height]="alto()" [alt]="alt()" (error)="fallo.set(true)" />`,
  styles: `
    :host { display: block; }
    img { display: block; width: 100%; height: auto; aspect-ratio: var(--relacion, 3 / 2); object-fit: cover; background: #e5e7eb; border-radius: 0.75rem; }
  `,
  host: { '[style.--relacion]': 'cuadrada() ? "1 / 1" : "3 / 2"' },
})
export class Foto {
  readonly src = input<string | null>(null);
  readonly alt = input<string>('');
  readonly tabla = input.required<TablaFoto>();

  protected readonly fallo = signal(false);
  protected readonly cuadrada = computed(() => this.tabla() === 'reg');
  protected readonly ancho = computed(() => (this.cuadrada() ? 400 : 600));
  protected readonly alto = computed(() => (this.cuadrada() ? 400 : 400));
  protected readonly origen = computed(() => (this.fallo() || !this.src() ? 'sin-foto.svg' : (this.src() as string)));
}
