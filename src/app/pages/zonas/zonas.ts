import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HumanitarianService } from '../../core/humanitarian.service';
import { Prioridad, TipoDesastre } from '../../core/models';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';
import { injectFragment, toneDePrioridad } from '../../shared/ui';

@Component({
  selector: 'app-zonas',
  imports: [RouterLink, DatePipe, DecimalPipe, Badge, PageHeader],
  templateUrl: './zonas.html',
})
export class Zonas {
  private readonly datos = inject(HumanitarianService);

  protected readonly seleccionada = injectFragment();
  protected readonly tipo = signal<TipoDesastre | ''>('');
  protected readonly prioridad = signal<Prioridad | ''>('');
  protected readonly tipos: readonly TipoDesastre[] = ['Sismo', 'Inundación', 'Deslizamiento', 'Sequía'];
  protected readonly prioridades: readonly Prioridad[] = ['Alta', 'Media', 'Baja'];
  protected readonly tonePrioridad = toneDePrioridad;

  protected readonly zonas = computed(() =>
    this.datos.zonas().filter(
      (z) => (!this.tipo() || z.tipo === this.tipo()) && (!this.prioridad() || z.prioridad === this.prioridad()),
    ),
  );

  protected cambiarTipo(event: Event): void {
    this.tipo.set((event.target as HTMLSelectElement).value as TipoDesastre | '');
  }

  protected cambiarPrioridad(event: Event): void {
    this.prioridad.set((event.target as HTMLSelectElement).value as Prioridad | '');
  }
}
