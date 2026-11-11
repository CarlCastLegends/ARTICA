import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, pattern, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { HumanitarianService, mensajeError } from '../../core/humanitarian.service';
import { Capacidad } from '../../core/models';
import { Badge } from '../../shared/badge';
import { FotoEditable } from '../../shared/foto-editable';
import { FOTO_VACIA, FotoValor, armarFormData, errorFoto } from '../../shared/foto-util';
import { Nivel } from '../../shared/nivel';
import { PageHeader } from '../../shared/page-header';
import { PhotoField } from '../../shared/photo-field';
import { etiquetaCapacidad, injectFragment, toneDeCapacidad } from '../../shared/ui';

interface AcopioForm {
  titulo: string;
  zona: string;
  capacidad: Capacidad;
  idInventario: string;
  enlaceMaps: string;
}

const VACIO: AcopioForm = { titulo: '', zona: '', capacidad: 'intermedio', idInventario: '', enlaceMaps: '' };

@Component({
  selector: 'app-acopio',
  imports: [RouterLink, DecimalPipe, FormField, FormRoot, Badge, Nivel, PageHeader, PhotoField, FotoEditable],
  templateUrl: './acopio.html',
})
export class Acopio {
  private readonly datos = inject(HumanitarianService);

  protected readonly acopios = this.datos.acopios;
  protected readonly inventario = computed(() => this.datos.catalogos()?.inventario ?? []);
  protected readonly recursosDisponibles = computed(() => this.datos.catalogos()?.recursos ?? []);
  protected readonly seleccionado = injectFragment();
  protected readonly etiquetaCapacidad = etiquetaCapacidad;
  protected readonly toneCapacidad = toneDeCapacidad;
  protected readonly capacidades: readonly Capacidad[] = ['alto', 'intermedio', 'pocos', 'sin insumos'];

  protected readonly mostrarForm = signal(false);
  protected readonly foto = signal<FotoValor>(FOTO_VACIA);
  protected readonly recursos = signal<readonly string[]>([]);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);

  private readonly modelo = signal<AcopioForm>({ ...VACIO });

  protected readonly f = form(
    this.modelo,
    (p) => {
      required(p.titulo, { message: 'Indica un nombre para el acopio.' });
      required(p.zona, { message: 'Indica la zona o sector.' });
      pattern(p.enlaceMaps, /^https?:\/\/\S+$/i, { message: 'Debe ser un enlace http:// o https://' });
    },
    {
      submission: {
        action: async () => {
          this.errorEnvio.set(null);
          this.exito.set(null);
          const problema = errorFoto(this.foto());
          if (problema) return void this.errorEnvio.set(problema);
          try {
            const nuevo = await this.datos.crearAcopio(armarFormData({ ...this.modelo(), recursosComunes: [...this.recursos()] }, this.foto()));
            this.exito.set(`Acopio «${nuevo.titulo}» registrado.`);
            this.modelo.set({ ...VACIO });
            this.recursos.set([]);
            this.foto.set(FOTO_VACIA);
            this.f().reset();
            this.mostrarForm.set(false);
          } catch (err) {
            this.errorEnvio.set(mensajeError(err));
          }
          return undefined;
        },
      },
    },
  );

  protected alternarRecurso(recurso: string, event: Event): void {
    const marcado = (event.target as HTMLInputElement).checked;
    this.recursos.update((l) => (marcado ? [...l, recurso] : l.filter((r) => r !== recurso)));
  }
}
