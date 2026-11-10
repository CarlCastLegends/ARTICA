import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HumanitarianService } from '../../core/humanitarian.service';
import { EstadoTransporte } from '../../core/models';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';
import { injectFragment, toneDeTransporte } from '../../shared/ui';

@Component({
  selector: 'app-transporte',
  imports: [RouterLink, DatePipe, DecimalPipe, Badge, PageHeader],
  templateUrl: './transporte.html',
})
export class Transporte {
  private readonly datos = inject(HumanitarianService);

  protected readonly seleccionado = injectFragment();
  protected readonly filtro = signal<EstadoTransporte | ''>('');
  protected readonly estados: readonly EstadoTransporte[] = ['Preparando', 'En tránsito', 'Entregado'];
  protected readonly toneEstado = toneDeTransporte;

  protected readonly despachos = computed(() =>
    this.datos.despachos().filter((d) => !this.filtro() || d.estado === this.filtro()),
  );

  protected nombreAcopio(id: string): string {
    return this.datos.acopioPorId(id)?.nombre ?? id;
  }

  protected zona(id: string): string {
    return this.datos.zonaPorId(id)?.titulo ?? id;
  }

  protected alcanzado(estado: EstadoTransporte, paso: EstadoTransporte): boolean {
    return this.estados.indexOf(estado) >= this.estados.indexOf(paso);
  }
}
