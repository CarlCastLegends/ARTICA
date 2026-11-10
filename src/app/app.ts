import { NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, PLATFORM_ID, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HumanitarianService } from './core/humanitarian.service';
import { Icon, IconName } from './shared/icon';

interface ItemMenu {
  readonly ruta: string;
  readonly etiqueta: string;
  readonly icono: IconName;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgOptimizedImage, Icon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly principal = viewChild.required<ElementRef<HTMLElement>>('principal');

  protected readonly resumen = inject(HumanitarianService).resumen;
  protected readonly menu: readonly ItemMenu[] = [
    { ruta: '/', etiqueta: 'Dashboard', icono: 'dashboard' },
    { ruta: '/donar', etiqueta: 'Donar', icono: 'heart' },
    { ruta: '/seguimiento', etiqueta: 'Seguimiento y trazado', icono: 'map' },
    { ruta: '/zonas', etiqueta: 'Zonas afectadas', icono: 'alert' },
    { ruta: '/transporte', etiqueta: 'Transporte', icono: 'truck' },
    { ruta: '/acopio', etiqueta: 'Zonas de acopio', icono: 'box' },
    { ruta: '/personas', etiqueta: 'Desaparecidos y encontrados', icono: 'users' },
    { ruta: '/nosotros', etiqueta: 'Sobre nosotros', icono: 'info' },
  ];

  constructor() {
    let primera = true;
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        // Gestión de foco: tras navegar, el foco pasa al contenido principal.
        if (primera) { primera = false; return; }
        if (this.esNavegador) this.principal().nativeElement.focus({ preventScroll: true });
      });
  }

  protected saltar(event: Event): void {
    event.preventDefault();
    this.principal().nativeElement.focus();
  }
}
