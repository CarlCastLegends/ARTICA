import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, min, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { HumanitarianService, mensajeError } from '../../core/humanitarian.service';
import { EstadoTransporte } from '../../core/models';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';
import { etiquetaPrioridad, injectFragment, toneDePrioridad, toneDeTransporte } from '../../shared/ui';

interface EntregaForm {
  idAcopio: string;
  idAfectado: string;
  idVehiculo: string;
  cantidadObjetivo: number | null;
}

const VACIO: EntregaForm = { idAcopio: '', idAfectado: '', idVehiculo: '', cantidadObjetivo: null };

@Component({
  selector: 'app-transporte',
  imports: [RouterLink, DatePipe, DecimalPipe, FormField, FormRoot, Badge, PageHeader],
  templateUrl: './transporte.html',
})
export class Transporte {
  private readonly datos = inject(HumanitarianService);

  protected readonly seleccionado = injectFragment();
  protected readonly filtro = signal<EstadoTransporte | ''>('');
  protected readonly estados: readonly EstadoTransporte[] = ['Preparando', 'En tránsito', 'Entregado'];
  protected readonly toneEstado = toneDeTransporte;
  protected readonly etiquetaPrioridad = etiquetaPrioridad;
  protected readonly tonePrioridad = toneDePrioridad;

  protected readonly acopios = this.datos.acopios;
  protected readonly afectados = this.datos.afectados;
  protected readonly vehiculos = computed(() => this.datos.catalogos()?.vehiculos ?? []);
  protected readonly inventario = computed(() => this.datos.catalogos()?.inventario ?? []);
  protected readonly entregas = computed(() => this.datos.entregas().filter((e) => !this.filtro() || e.estado === this.filtro()));

  protected readonly mostrarForm = signal(false);
  protected readonly items = signal<readonly number[]>([]);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly ocupado = signal<number | null>(null);

  private readonly modelo = signal<EntregaForm>({ ...VACIO });

  protected readonly f = form(
    this.modelo,
    (p) => {
      required(p.idAcopio, { message: 'Elige el acopio de origen.' });
      required(p.idAfectado, { message: 'Elige la zona afectada de destino.' });
      required(p.idVehiculo, { message: 'Elige un vehículo.' });
      required(p.cantidadObjetivo, { message: 'Indica la cantidad.' });
      min(p.cantidadObjetivo, 1, { message: 'Debe ser mayor que 0.' });
    },
    {
      submission: {
        action: async () => {
          this.errorEnvio.set(null);
          this.exito.set(null);
          const m = this.modelo();
          try {
            const nueva = await this.datos.crearEntrega({
              idAcopio: Number(m.idAcopio),
              idAfectado: Number(m.idAfectado),
              idVehiculo: Number(m.idVehiculo),
              cantidadObjetivo: m.cantidadObjetivo,
              idInventario: [...this.items()],
            });
            this.exito.set(`Despacho ${nueva.codigo} creado.`);
            this.modelo.set({ ...VACIO });
            this.items.set([]);
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

  protected alternarItem(id: number, event: Event): void {
    const marcado = (event.target as HTMLInputElement).checked;
    this.items.update((l) => (marcado ? [...l, id] : l.filter((x) => x !== id)));
  }

  protected alcanzado(estado: EstadoTransporte, paso: EstadoTransporte): boolean {
    return this.estados.indexOf(estado) >= this.estados.indexOf(paso);
  }

  protected siguiente(estado: EstadoTransporte): EstadoTransporte | null {
    const i = this.estados.indexOf(estado);
    return i < this.estados.length - 1 ? this.estados[i + 1] : null;
  }

  protected async avanzar(id: number, estado: EstadoTransporte): Promise<void> {
    const sig = this.siguiente(estado);
    if (!sig) return;
    this.ocupado.set(id);
    this.errorEnvio.set(null);
    try {
      await this.datos.cambiarEstado(id, sig);
    } catch (err) {
      this.errorEnvio.set(mensajeError(err));
    } finally {
      this.ocupado.set(null);
    }
  }
}
