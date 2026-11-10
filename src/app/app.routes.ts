import { Routes } from '@angular/router';

const TITULO = 'ARTICA';

export const routes: Routes = [
  { path: '', title: `Dashboard · ${TITULO}`, loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'donar', title: `Donar · ${TITULO}`, loadComponent: () => import('./pages/donar/donar').then((m) => m.Donar) },
  { path: 'seguimiento', title: `Seguimiento y trazado · ${TITULO}`, loadComponent: () => import('./pages/seguimiento/seguimiento').then((m) => m.Seguimiento) },
  { path: 'zonas', title: `Zonas afectadas · ${TITULO}`, loadComponent: () => import('./pages/zonas/zonas').then((m) => m.Zonas) },
  { path: 'transporte', title: `Transporte · ${TITULO}`, loadComponent: () => import('./pages/transporte/transporte').then((m) => m.Transporte) },
  { path: 'acopio', title: `Zonas de acopio · ${TITULO}`, loadComponent: () => import('./pages/acopio/acopio').then((m) => m.Acopio) },
  { path: 'personas', title: `Desaparecidos y encontrados · ${TITULO}`, loadComponent: () => import('./pages/personas/personas').then((m) => m.Personas) },
  { path: 'nosotros', title: `Sobre nosotros · ${TITULO}`, loadComponent: () => import('./pages/nosotros/nosotros').then((m) => m.Nosotros) },
  { path: '**', redirectTo: '' },
];
