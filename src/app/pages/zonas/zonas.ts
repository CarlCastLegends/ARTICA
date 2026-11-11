import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, pattern, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { HumanitarianService, mensajeError } from '../../core/humanitarian.service';
import { Prioridad } from '../../core/models';
import { Badge } from '../../shared/badge';
import { FotoEditable } from '../../shared/foto-editable';
import { FOTO_VACIA, FotoValor, armarFormData, errorFoto } from '../../shared/foto-util';
import { PageHeader } from '../../shared/page-header';
import { PhotoField } from '../../shared/photo-field';
import { etiquetaPrioridad, injectFragment, toneDePrioridad } from '../../shared/ui';

interface ZonaForm {
  titulo: string;
  zona: string;
  prioridad: Prioridad;
  poblacionRiesgo: number | null;
  tipoDesastre: string;
  magnitud: string;
  enlaceMaps: string;
}

const VACIO: ZonaForm = { titulo: '', zona: '', prioridad: 'medio', poblacionRiesgo: null, tipoDesastre: '', magnitud: '', enlaceMaps: '' };

@Component({
  selector: 'app-zonas',
  imports: [RouterLink, DatePipe, DecimalPipe, FormField, FormRoot, Badge, PageHeader, PhotoField, FotoEditable],
  templateUrl: './zonas.html',
})
export class Zonas {
  private readonly datos = inject(HumanitarianService);

  protected readonly seleccionada = injectFragment();
  protected readonly filtroPrioridad = signal<Prioridad | ''>('');
  protected readonly filtroTipo = signal('');
  protected readonly prioridades: readonly Prioridad[] = ['alto', 'medio', 'bajo'];
  protected readonly etiquetaPrioridad = etiquetaPrioridad;
  protected readonly tonePrioridad = toneDePrioridad;

  protected readonly tipos = computed(() => [...new Set(this.datos.afectados().map((a) => a.tipoDesastre).filter((t): t is string => !!t))].sort());
  protected readonly zonas = computed(() =>
    this.datos.afectados().filter(
      (z) => (!this.filtroPrioridad() || z.prioridad === this.filtroPrioridad()) && (!this.filtroTipo() || z.tipoDesastre === this.filtroTipo()),
    ),
  );

  protected readonly mostrarForm = signal(false);
  protected readonly foto = signal<FotoValor>(FOTO_VACIA);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);

  private readonly modelo = signal<ZonaForm>({ ...VACIO });

  protected readonly f = form(
    this.modelo,
    (p) => {
      required(p.titulo, { message: 'Indica un título.' });
      required(p.zona, { message: 'Indica la zona o sector.' });
      required(p.poblacionRiesgo, { message: 'Indica la población en riesgo.' });
      min(p.poblacionRiesgo, 0, { message: 'Debe ser 0 o más.' });
      max(p.poblacionRiesgo, 100000, { message: 'Máximo 100.000 personas.' });
      pattern(p.enlaceMaps, /^https?:\/\/\S+$/i, { message: 'Debe ser un enlace http:// o https://' });
    },
    {
      submission: {
        action: async () => {
          this.errorEnvio.set(null);
          this.exito.set(null);
          const problema = errorFoto(this.foto());
          if (problema) return void this.errorEnvio.set(problema);
          const m = this.modelo();
          try {
            const nueva = await this.datos.crearAfectado(armarFormData({ ...m }, this.foto()));
            this.exito.set(`Zona «${nueva.titulo}» registrada.`);
            this.modelo.set({ ...VACIO });
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

  protected cambiarPrioridad(event: Event): void {
    this.filtroPrioridad.set((event.target as HTMLSelectElement).value as Prioridad | '');
  }

  protected cambiarTipo(event: Event): void {
    this.filtroTipo.set((event.target as HTMLSelectElement).value);
  }
}
