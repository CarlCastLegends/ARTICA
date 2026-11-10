import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { HumanitarianService } from '../../core/humanitarian.service';
import { Aporte, TipoAporte } from '../../core/models';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';
import { toneDeDisponibilidad } from '../../shared/ui';

interface AporteForm {
  nombre: string;
  correo: string;
  tipo: TipoAporte;
  acopioId: string;
  detalle: string;
}

@Component({
  selector: 'app-donar',
  imports: [RouterLink, DatePipe, FormField, FormRoot, Badge, PageHeader],
  templateUrl: './donar.html',
})
export class Donar {
  private readonly datos = inject(HumanitarianService);

  /** Punto de acopio preseleccionado desde `?acopio=` */
  readonly acopio = input<string>();

  protected readonly acopios = computed(() => this.datos.acopios().filter((a) => a.disponibilidad !== 'Lleno'));
  protected readonly aportes = this.datos.aportes;
  protected readonly toneDisponibilidad = toneDeDisponibilidad;
  protected readonly tipos: readonly TipoAporte[] = ['Insumos', 'Dinero', 'Voluntariado'];
  protected readonly confirmado = signal<Aporte | null>(null);

  private readonly modelo = linkedSignal<AporteForm>(() => ({
    nombre: '', correo: '', tipo: 'Insumos', acopioId: this.acopio() ?? '', detalle: '',
  }));

  protected readonly f = form(
    this.modelo,
    (p) => {
      required(p.nombre, { message: 'Indica tu nombre.' });
      required(p.correo, { message: 'Indica tu correo electrónico.' });
      email(p.correo, { message: 'Escribe un correo válido.' });
      required(p.acopioId, { message: 'Elige un punto de acopio.' });
      required(p.detalle, { message: 'Describe tu aporte.' });
      minLength(p.detalle, 5, { message: 'Escribe al menos 5 caracteres.' });
    },
    {
      submission: {
        action: async () => {
          this.confirmado.set(this.datos.registrarAporte(this.modelo()));
          this.modelo.set({ nombre: '', correo: '', tipo: 'Insumos', acopioId: '', detalle: '' });
          this.f().reset();
          return undefined;
        },
      },
    },
  );

  protected nombreAcopio(id: string): string {
    return this.datos.acopioPorId(id)?.nombre ?? id;
  }
}
