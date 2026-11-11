import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HumanitarianService } from '../../core/humanitarian.service';
import { Badge } from '../../shared/badge';
import { Nivel } from '../../shared/nivel';
import { StatCard } from '../../shared/stat-card';
import { etiquetaCapacidad, etiquetaPrioridad, toneDeCapacidad, toneDePrioridad, toneDeTransporte } from '../../shared/ui';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe, Badge, StatCard, Nivel],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly datos = inject(HumanitarianService);

  protected readonly cargando = this.datos.cargando;
  protected readonly resumen = this.datos.resumen;
  protected readonly ultimasZonas = computed(() => this.datos.afectados().slice(0, 3));
  protected readonly acopios = this.datos.acopios;
  protected readonly ultimasEntregas = computed(() => this.datos.entregas().slice(0, 3));

  protected readonly etiquetaPrioridad = etiquetaPrioridad;
  protected readonly tonePrioridad = toneDePrioridad;
  protected readonly etiquetaCapacidad = etiquetaCapacidad;
  protected readonly toneCapacidad = toneDeCapacidad;
  protected readonly toneTransporte = toneDeTransporte;
}
