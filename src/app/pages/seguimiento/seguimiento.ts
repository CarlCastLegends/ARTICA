import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HumanitarianService } from '../../core/humanitarian.service';
import { LAKE_POINTS, MAP_ASPECT, project } from '../../core/geo';
import { Icon, IconName } from '../../shared/icon';
import { PageHeader } from '../../shared/page-header';
import { injectFragment } from '../../shared/ui';

type TipoPunto = 'zona' | 'acopio' | 'transporte';

interface Punto {
  readonly id: string;
  readonly tipo: TipoPunto;
  readonly nombre: string;
  readonly detalle: string;
  readonly ruta: string;
  readonly x: number;
  readonly y: number;
}

const ICONOS: Record<TipoPunto, IconName> = { zona: 'alert', acopio: 'box', transporte: 'truck' };
const ETIQUETAS: Record<TipoPunto, string> = { zona: 'Zona afectada', acopio: 'Zona de acopio', transporte: 'Transporte en ruta' };

@Component({
  selector: 'app-seguimiento',
  imports: [RouterLink, Icon, PageHeader],
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.css',
})
export class Seguimiento {
  private readonly datos = inject(HumanitarianService);

  protected readonly seleccionado = injectFragment();
  protected readonly filtro = signal<TipoPunto | ''>('');
  protected readonly lago = LAKE_POINTS;
  protected readonly aspecto = MAP_ASPECT;
  protected readonly tipos: readonly TipoPunto[] = ['zona', 'acopio', 'transporte'];
  protected readonly icono = (t: TipoPunto): IconName => ICONOS[t];
  protected readonly etiqueta = (t: TipoPunto): string => ETIQUETAS[t];

  private readonly puntos = computed<readonly Punto[]>(() => [
    ...this.datos.zonas().map((z) => ({
      id: z.id, tipo: 'zona' as const, nombre: z.titulo, ruta: '/zonas',
      detalle: `${z.tipo} · prioridad ${z.prioridad.toLowerCase()}`, ...project(z.lat, z.lng),
    })),
    ...this.datos.acopios().map((a) => ({
      id: a.id, tipo: 'acopio' as const, nombre: a.nombre, ruta: '/acopio',
      detalle: `${a.disponibilidad} · ${a.municipio}`, ...project(a.lat, a.lng),
    })),
    ...this.datos.despachos().filter((d) => d.estado !== 'Entregado').map((d) => ({
      id: d.id, tipo: 'transporte' as const, nombre: `${d.codigo} · ${d.carga}`, ruta: '/transporte',
      detalle: `${d.estado} hacia ${this.datos.zonaPorId(d.destinoId)?.titulo ?? ''}`, ...project(d.lat, d.lng),
    })),
  ]);

  protected readonly visibles = computed(() => this.puntos().filter((p) => !this.filtro() || p.tipo === this.filtro()));
}
