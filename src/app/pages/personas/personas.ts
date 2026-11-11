import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, pattern, required } from '@angular/forms/signals';
import { HumanitarianService, mensajeError } from '../../core/humanitarian.service';
import { EstadoPersona } from '../../core/models';
import { Badge } from '../../shared/badge';
import { FotoEditable } from '../../shared/foto-editable';
import { FOTO_VACIA, FotoValor, armarFormData, errorFoto } from '../../shared/foto-util';
import { PageHeader } from '../../shared/page-header';
import { PhotoField } from '../../shared/photo-field';
import { injectFragment } from '../../shared/ui';

interface ReporteForm {
  estado: EstadoPersona;
  nombreCompleto: string;
  edad: number | null;
  cedula: string;
  idZona: string;
}

const VACIO: ReporteForm = { estado: 'Desaparecida', nombreCompleto: '', edad: null, cedula: '', idZona: '' };

@Component({
  selector: 'app-personas',
  imports: [DatePipe, FormField, FormRoot, Badge, PageHeader, PhotoField, FotoEditable],
  templateUrl: './personas.html',
})
export class Personas {
  private readonly datos = inject(HumanitarianService);

  protected readonly seleccionada = injectFragment();
  protected readonly filtro = signal<EstadoPersona | ''>('');
  protected readonly busqueda = signal('');
  protected readonly resumen = this.datos.resumen;
  protected readonly afectados = this.datos.afectados;
  protected readonly estados: readonly EstadoPersona[] = ['Desaparecida', 'Encontrada'];

  protected readonly personas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    return this.datos
      .registrados()
      .filter(
        (p) =>
          (!this.filtro() || p.estado === this.filtro()) &&
          (!q || p.nombreCompleto.toLowerCase().includes(q) || (!!digitos && p.cedula.replace(/\D/g, '').includes(digitos))),
      );
  });

  protected readonly mostrarForm = signal(false);
  protected readonly foto = signal<FotoValor>(FOTO_VACIA);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly ocupado = signal<number | null>(null);

  private readonly modelo = signal<ReporteForm>({ ...VACIO });

  protected readonly f = form(
    this.modelo,
    (p) => {
      required(p.nombreCompleto, { message: 'Indica el nombre completo.' });
      required(p.edad, { message: 'Indica la edad.' });
      min(p.edad, 0, { message: 'La edad no es válida.' });
      max(p.edad, 120, { message: 'La edad no es válida.' });
      required(p.cedula, { message: 'Indica la cédula de identidad.' });
      pattern(p.cedula, /^[VvEe]?-?\d{1,2}\.?\d{3}\.?\d{3}$/, { message: 'Formato esperado: V-12.345.678' });
    },
    {
      submission: {
        action: async () => {
          this.errorEnvio.set(null);
          this.exito.set(null);
          const problema = errorFoto(this.foto());
          if (problema) return void this.errorEnvio.set(problema);
          try {
            const r = await this.datos.crearRegistrado(armarFormData({ ...this.modelo() }, this.foto()));
            this.exito.set(`Reporte de ${r.nombreCompleto} registrado como ${r.estado.toLowerCase()}.`);
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

  protected buscar(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  protected async encontrada(id: number): Promise<void> {
    this.ocupado.set(id);
    this.errorEnvio.set(null);
    try {
      await this.datos.marcarEncontrado(id);
    } catch (err) {
      this.errorEnvio.set(mensajeError(err));
    } finally {
      this.ocupado.set(null);
    }
  }
}
