import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormField, FormRoot, email, form, min, pattern, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { HumanitarianService, mensajeError } from '../../core/humanitarian.service';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';
import { etiquetaCapacidad, toneDeCapacidad } from '../../shared/ui';

interface DonacionForm {
  nombre: string;
  correo: string;
  dinero: number | null;
  pais: string;
  idAcopio: string;
}

interface VoluntarioForm {
  nombreCompleto: string;
  cedula: string;
  idAcopio: string;
}

@Component({
  selector: 'app-donar',
  imports: [RouterLink, FormField, FormRoot, Badge, PageHeader],
  templateUrl: './donar.html',
})
export class Donar {
  private readonly datos = inject(HumanitarianService);

  /** Punto de acopio preseleccionado desde `?acopio=` */
  readonly acopio = input<string>();

  protected readonly acopios = this.datos.acopios;
  protected readonly donadores = computed(() => this.datos.donadores().slice(0, 6));
  protected readonly paises = computed(() => this.datos.catalogos()?.paises ?? []);
  protected readonly recursosDisponibles = computed(() => this.datos.catalogos()?.recursos ?? []);
  protected readonly etiquetaCapacidad = etiquetaCapacidad;
  protected readonly toneCapacidad = toneDeCapacidad;

  protected readonly recursos = signal<readonly string[]>([]);
  protected readonly errorDonacion = signal<string | null>(null);
  protected readonly confirmada = signal<{ codigo: string; nombre: string } | null>(null);
  protected readonly errorVoluntario = signal<string | null>(null);
  protected readonly voluntarioOk = signal<string | null>(null);

  private readonly modeloDonacion = linkedSignal<DonacionForm>(() => ({
    nombre: '', correo: '', dinero: null, pais: 'Venezuela', idAcopio: this.acopio() ?? '',
  }));

  protected readonly f = form(
    this.modeloDonacion,
    (p) => {
      required(p.nombre, { message: 'Indica tu nombre.' });
      required(p.correo, { message: 'Indica tu correo electrónico.' });
      email(p.correo, { message: 'Escribe un correo válido.' });
      required(p.idAcopio, { message: 'Elige un punto de acopio.' });
      min(p.dinero, 0, { message: 'El monto no puede ser negativo.' });
    },
    {
      submission: {
        action: async () => {
          this.errorDonacion.set(null);
          this.confirmada.set(null);
          const m = this.modeloDonacion();
          if (!this.recursos().length && !(m.dinero && m.dinero > 0)) {
            return void this.errorDonacion.set('Elige al menos un recurso o indica un monto en dinero.');
          }
          try {
            const r = await this.datos.crearDonador({
              nombre: m.nombre, correo: m.correo, recursos: [...this.recursos()],
              dinero: m.dinero ?? 0, pais: m.pais, idAcopio: Number(m.idAcopio),
            });
            this.confirmada.set({ codigo: r.codigo, nombre: m.nombre });
            this.modeloDonacion.set({ nombre: '', correo: '', dinero: null, pais: 'Venezuela', idAcopio: '' });
            this.recursos.set([]);
            this.f().reset();
          } catch (err) {
            this.errorDonacion.set(mensajeError(err));
          }
          return undefined;
        },
      },
    },
  );

  private readonly modeloVoluntario = signal<VoluntarioForm>({ nombreCompleto: '', cedula: '', idAcopio: '' });

  protected readonly v = form(
    this.modeloVoluntario,
    (p) => {
      required(p.nombreCompleto, { message: 'Indica tu nombre completo.' });
      required(p.cedula, { message: 'Indica tu cédula.' });
      pattern(p.cedula, /^[VvEe]?-?\d{1,2}\.?\d{3}\.?\d{3}$/, { message: 'Formato esperado: V-12.345.678' });
      required(p.idAcopio, { message: 'Elige un punto de acopio.' });
    },
    {
      submission: {
        action: async () => {
          this.errorVoluntario.set(null);
          this.voluntarioOk.set(null);
          const m = this.modeloVoluntario();
          try {
            await this.datos.crearVoluntario({ nombreCompleto: m.nombreCompleto, cedula: m.cedula, idAcopio: Number(m.idAcopio) });
            this.voluntarioOk.set(`¡Gracias, ${m.nombreCompleto}! Te contactaremos con el punto de acopio elegido.`);
            this.modeloVoluntario.set({ nombreCompleto: '', cedula: '', idAcopio: '' });
            this.v().reset();
          } catch (err) {
            this.errorVoluntario.set(mensajeError(err));
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
