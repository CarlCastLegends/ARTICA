import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header';

/* Edita estos datos con la información real del equipo antes de publicar. */
const EQUIPO = [
  { nombre: 'Nombre del integrante 1', rol: 'Coordinación y logística' },
  { nombre: 'Nombre del integrante 2', rol: 'Desarrollo del sistema' },
  { nombre: 'Nombre del integrante 3', rol: 'Datos y trazabilidad' },
] as const;

@Component({
  selector: 'app-nosotros',
  imports: [PageHeader],
  template: `
    <div class="page">
      <app-page-header titulo="Sobre nosotros" descripcion="Quiénes creamos ARTICA, para qué existe y cómo contactarnos." />

      <section class="card stack" aria-labelledby="h-prop">
        <h2 id="h-prop">Propósito</h2>
        <p>
          ARTICA articula la logística, la trazabilidad de donaciones y la gestión distribuida de la ayuda
          humanitaria ante contingencias y vulnerabilidad social regional en Venezuela. Conecta a donantes,
          puntos de acopio, transporte y comunidades afectadas en un solo lugar, para que cada aporte se pueda
          seguir desde que se entrega hasta que llega.
        </p>
      </section>

      <div class="grid grid--2">
        <section class="card stack" aria-labelledby="h-equipo">
          <h2 id="h-equipo">Quiénes lo creamos</h2>
          <ul class="list">
            @for (m of equipo; track m.nombre) {
              <li class="list__item"><span class="list__title">{{ m.nombre }}</span><span class="meta">{{ m.rol }}</span></li>
            }
          </ul>
        </section>

        <section class="card stack" aria-labelledby="h-contacto">
          <h2 id="h-contacto">Contacto</h2>
          <ul class="meta-list">
            <li><strong>Correo:</strong> <a href="mailto:contacto@artica.example">contacto&#64;artica.example</a></li>
            <li><strong>Teléfono:</strong> 0000-0000000</li>
            <li><strong>Ubicación:</strong> Zulia, Venezuela</li>
          </ul>
          <p class="meta">Datos de ejemplo: reemplázalos por los reales en <code>nosotros.ts</code>.</p>
        </section>
      </div>
    </div>
  `,
})
export class Nosotros {
  protected readonly equipo = EQUIPO;
}
