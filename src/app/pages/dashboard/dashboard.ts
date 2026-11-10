import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HumanitarianService } from '../../core/humanitarian.service';
import { Badge } from '../../shared/badge';
import { StatCard } from '../../shared/stat-card';
import { toneDeDisponibilidad, toneDePrioridad, toneDeTransporte } from '../../shared/ui';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe, Badge, StatCard],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly datos = inject(HumanitarianService);

  protected readonly resumen = this.datos.resumen;
  protected readonly ultimasZonas = computed(() => this.datos.zonas().slice(0, 3));
  protected readonly acopios = this.datos.acopios;
  protected readonly ultimosDespachos = computed(() => this.datos.despachos().slice(0, 3));

  protected readonly tonePrioridad = toneDePrioridad;
  protected readonly toneDisponibilidad = toneDeDisponibilidad;
  protected readonly toneTransporte = toneDeTransporte;

  protected nombreAcopio(id: string): string {
    return this.datos.acopioPorId(id)?.nombre ?? id;
  }

  protected nombreZona(id: string): string {
    return this.datos.zonaPorId(id)?.titulo ?? id;
  }
}
