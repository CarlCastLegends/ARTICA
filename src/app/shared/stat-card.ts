import { Component, input } from '@angular/core';
import { Icon, IconName } from './icon';

@Component({
  selector: 'app-stat-card',
  imports: [Icon],
  template: `
    <div class="stat__body">
      <span class="stat__label">{{ etiqueta() }}</span>
      <span class="stat__value">{{ valor() }}</span>
      <span class="stat__hint">{{ detalle() }}</span>
    </div>
    <span class="stat__icon"><app-icon [name]="icono()" /></span>
  `,
  host: { class: 'card stat' },
})
export class StatCard {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string | number>();
  readonly detalle = input<string>('');
  readonly icono = input.required<IconName>();
}
