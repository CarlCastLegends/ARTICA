import { Component, input } from '@angular/core';

export type Tone = 'alta' | 'media' | 'baja' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  template: `<ng-content />`,
  host: { '[class]': '"badge badge--" + tone()' },
})
export class Badge {
  readonly tone = input<Tone>('neutral');
}
