import { Component, inject, input, signal } from '@angular/core';
import { mensajeError, HumanitarianService } from '../core/humanitarian.service';
import { TablaFoto } from '../core/models';
import { Foto } from './foto';
import { FOTO_VACIA, FotoValor, armarFormData, errorFoto } from './foto-util';
import { PhotoField } from './photo-field';

/** Muestra la foto de un registro y permite cambiarla (enlace o archivo). */
@Component({
  selector: 'app-foto-editable',
  imports: [Foto, PhotoField],
  template: `
    <app-foto [src]="foto()" [alt]="alt()" [tabla]="tabla()" />
    @if (editando()) {
      <div class="stack">
        <app-photo-field [(valor)]="nueva" [carpeta]="tabla()" />
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="row">
          <button type="button" class="btn" [disabled]="guardando()" (click)="guardar()">Guardar foto</button>
          <button type="button" class="btn btn--ghost" (click)="cancelar()">Cancelar</button>
        </div>
      </div>
    } @else {
      <button type="button" class="btn btn--ghost" (click)="editando.set(true)">Cambiar foto</button>
    }
  `,
  styles: `:host { display: grid; gap: 0.6rem; align-content: start; }`,
})
export class FotoEditable {
  private readonly datos = inject(HumanitarianService);

  readonly tabla = input.required<TablaFoto>();
  readonly id = input.required<number>();
  readonly foto = input<string | null>(null);
  readonly alt = input<string>('');

  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly nueva = signal<FotoValor>(FOTO_VACIA);

  protected async guardar(): Promise<void> {
    const v = this.nueva();
    const problema = errorFoto(v);
    if (problema) return void this.error.set(problema);
    if (v.modo === 'ninguna' || (v.modo === 'enlace' && !v.enlace.trim()) || (v.modo === 'archivo' && !v.archivo)) {
      return void this.error.set('Elige un enlace o un archivo para cambiar la foto.');
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.datos.cambiarFoto(this.tabla(), this.id(), armarFormData({}, v));
      this.cancelar();
    } catch (err) {
      this.error.set(mensajeError(err));
    } finally {
      this.guardando.set(false);
    }
  }

  protected cancelar(): void {
    this.editando.set(false);
    this.error.set(null);
    this.nueva.set(FOTO_VACIA);
  }
}
