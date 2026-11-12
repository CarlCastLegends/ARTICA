import { Component, DestroyRef, inject, input, model, signal } from '@angular/core';
import { TablaFoto } from '../core/models';
import { FOTO_VACIA, FotoValor, ModoFoto, errorFoto } from './foto-util';

let contador = 0;

/** Campo OPCIONAL de foto: sin foto, enlace o archivo (.png/.jpg/.jpeg). */
@Component({
  selector: 'app-photo-field',
  template: `
    <fieldset class="photo">
      <legend>Foto (opcional)</legend>
      <div class="row">
        @for (m of modos; track m.id) {
          <label class="radio">
            <input type="radio" [name]="grupo" [value]="m.id" [checked]="valor().modo === m.id" (change)="elegir(m.id)" />
            {{ m.texto }}
          </label>
        }
      </div>

      @switch (valor().modo) {
        @case ('enlace') {
          <div class="field">
            <label [for]="grupo + '-url'">Enlace de la imagen</label>
            <input [id]="grupo + '-url'" class="input" type="url" inputmode="url" placeholder="https://…/foto.jpg" [value]="valor().enlace" (input)="cambiarEnlace($event)" />
          </div>
        }
        @case ('archivo') {
          <div class="field">
            <label [for]="grupo + '-file'">Archivo .png, .jpg o .jpeg (máx. 4 MB)</label>
            <input [id]="grupo + '-file'" class="input" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" (change)="elegirArchivo($event)" />
            <p class="meta">Se guardará en la carpeta <code>{{ carpeta() }}</code> del almacenamiento de fotos.</p>
          </div>
        }
        @default {
          <p class="meta">Si no agregas una foto se usará una imagen gris por defecto.</p>
        }
      }

      @if (mensaje()) {
        <p class="error" role="alert">{{ mensaje() }}</p>
      }
      @if (vista() && !mensaje()) {
        <img class="photo__prev" [src]="vista()" alt="Vista previa de la foto elegida" width="96" height="96" (error)="vistaFallida()" />
      }
    </fieldset>
  `,
  styles: `
    .photo { border: 1px solid var(--line); border-radius: 0.75rem; padding: 0.75rem 0.9rem; display: grid; gap: 0.6rem; min-width: 0; margin: 0; }
    legend { font-size: 0.8rem; font-weight: 600; color: #334155; padding: 0 0.3rem; }
    .row { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; }
    .radio { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; }
    .photo__prev { width: 6rem; height: 6rem; object-fit: cover; border-radius: 0.6rem; background: #e5e7eb; }
  `,
})
export class PhotoField {
  /** Valor elegido (se usa con `[(valor)]`). */
  readonly valor = model<FotoValor>(FOTO_VACIA);
  /** Carpeta donde se guardará si es archivo (solo informativo). */
  readonly carpeta = input.required<TablaFoto>();

  protected readonly grupo = `foto-${contador++}`;
  protected readonly modos: readonly { id: ModoFoto; texto: string }[] = [
    { id: 'ninguna', texto: 'Sin foto' },
    { id: 'enlace', texto: 'Usar un enlace' },
    { id: 'archivo', texto: 'Subir un archivo' },
  ];
  protected readonly vista = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);
  private urlObjeto: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.liberar());
  }

  protected elegir(modo: ModoFoto): void {
    this.liberar();
    this.vista.set(null);
    this.mensaje.set(null);
    this.valor.set({ ...FOTO_VACIA, modo });
  }

  protected cambiarEnlace(event: Event): void {
    const enlace = (event.target as HTMLInputElement).value;
    const nuevo: FotoValor = { modo: 'enlace', enlace, archivo: null };
    this.valor.set(nuevo);
    this.mensaje.set(errorFoto(nuevo));
    this.vista.set(enlace.trim() && !this.mensaje() ? enlace.trim() : null);
  }

  protected elegirArchivo(event: Event): void {
    this.liberar();
    const archivo = (event.target as HTMLInputElement).files?.[0] ?? null;
    const nuevo: FotoValor = { modo: 'archivo', enlace: '', archivo };
    this.valor.set(nuevo);
    this.mensaje.set(archivo ? errorFoto(nuevo) : null);
    if (archivo && !this.mensaje()) {
      this.urlObjeto = URL.createObjectURL(archivo);
      this.vista.set(this.urlObjeto);
    } else {
      this.vista.set(null);
    }
  }

  protected vistaFallida(): void {
    if (this.valor().modo === 'enlace') this.mensaje.set('No se pudo cargar una imagen desde ese enlace.');
  }

  private liberar(): void {
    if (this.urlObjeto) URL.revokeObjectURL(this.urlObjeto);
    this.urlObjeto = null;
  }
}
