import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <h1>{{ titulo() }}</h1>
      <p>{{ descripcion() }}</p>
    </header>
  `,
})
export class PageHeader {
  readonly titulo = input.required<string>();
  readonly descripcion = input.required<string>();
}
