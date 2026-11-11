import { RenderMode, ServerRoute } from '@angular/ssr';

/** Los datos vienen de la API en el navegador, así que las páginas se renderizan en el cliente. */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Client }];
