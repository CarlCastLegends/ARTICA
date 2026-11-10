import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HumanitarianService } from '../../core/humanitarian.service';
import { Badge } from '../../shared/badge';
import { PageHeader } from '../../shared/page-header';
import { injectFragment, toneDeDisponibilidad } from '../../shared/ui';

@Component({
  selector: 'app-acopio',
  imports: [RouterLink, DecimalPipe, Badge, PageHeader],
  templateUrl: './acopio.html',
})
export class Acopio {
  protected readonly acopios = inject(HumanitarianService).acopios;
  protected readonly seleccionado = injectFragment();
  protected readonly toneDisponibilidad = toneDeDisponibilidad;
}
