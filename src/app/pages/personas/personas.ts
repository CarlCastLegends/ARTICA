import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, min, pattern, required } from '@angular/forms/signals';
import { HumanitarianService } from '../../core/humanitarian.service';
import { EstadoPersona } from '../../core/models';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';

interface ReporteForm {
  estado: EstadoPersona;
  nombre: string;
  edad: number | null;
  cedula: string;
  municipio: string;
  contacto: string;
}

const VACIO: ReporteForm = { estado: 'Desaparecida', nombre: '', edad: null, cedula: '', municipio: '', contacto: '' };

@Component({
  selector: 'app-personas',
  imports: [DatePipe, FormField, FormRoot, Badge, PageHeader],
  templateUrl: './personas.html',
})
export class Personas {
  private readonly datos = inject(HumanitarianService);

  protected readonly filtro = signal<EstadoPersona | ''>('');
  protected readonly busqueda = signal('');
  protected readonly resumen = this.datos.resumen;
  protected readonly estados: readonly EstadoPersona[] = ['Desaparecida', 'Encontrada'];
  protected readonly enviado = signal<string | null>(null);

  protected readonly personas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.datos.personas().filter(
      (p) =>
        (!this.filtro() || p.estado === this.filtro()) &&
        (!q || p.nombre.toLowerCase().includes(q) || p.cedula.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')),
    );
  });

  private readonly modelo = signal<ReporteForm>({ ...VACIO });

  protected readonly f = form(
    this.modelo,
    (p) => {
      required(p.nombre, { message: 'Indica el nombre completo.' });
      required(p.edad, { message: 'Indica la edad.' });
      min(p.edad, 0, { message: 'La edad no es válida.' });
      max(p.edad, 120, { message: 'La edad no es válida.' });
      required(p.cedula, { message: 'Indica la cédula de identidad.' });
      pattern(p.cedula, /^[VvEe]?-?\d{1,2}\.?\d{3}\.?\d{3}$/, { message: 'Formato esperado: V-12.345.678' });
      required(p.municipio, { message: 'Indica el municipio.' });
      required(p.contacto, { message: 'Indica un teléfono de contacto.' });
    },
    {
      submission: {
        action: async () => {
          const m = this.modelo();
          const r = this.datos.registrarPersona({ ...m, edad: m.edad ?? 0 });
          this.enviado.set(`Reporte de ${r.nombre} registrado como ${r.estado.toLowerCase()}.`);
          this.modelo.set({ ...VACIO });
          this.f().reset();
          return undefined;
        },
      },
    },
  );

  protected buscar(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  protected tone(e: EstadoPersona) {
    return e === 'Encontrada' ? 'baja' : 'alta';
  }
}
