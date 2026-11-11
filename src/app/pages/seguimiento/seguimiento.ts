import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { LatLngBoundsExpression, LatLngExpression, Map as MapaLeaflet, Marker, LayerGroup } from 'leaflet';
import { HumanitarianService } from '../../core/humanitarian.service';
import { Coordenadas, coordenadasDeEnlace, esperar, geocodificar } from '../../core/geo';
import { etiquetaPrioridad, injectFragment } from '../../shared/ui';
import { PageHeader } from '../../shared/page-header';

type TipoPunto = 'afe' | 'aco' | 'ent';

interface Punto {
  readonly clave: string;
  readonly id: number;
  readonly tipo: TipoPunto;
  readonly nombre: string;
  readonly detalle: string;
  readonly ruta: string;
  readonly pos: Coordenadas;
}

interface Trazado {
  readonly clave: string;
  readonly codigo: string;
  readonly estado: string;
  readonly desde: Coordenadas;
  readonly hasta: Coordenadas;
}

const ETIQUETAS: Record<TipoPunto, string> = { afe: 'Zona afectada', aco: 'Zona de acopio', ent: 'Transporte en ruta' };
const RUTAS: Record<TipoPunto, string> = { afe: '/zonas', aco: '/acopio', ent: '/transporte' };
/** Iconos fijos (sin datos del usuario). */
const SVG: Record<TipoPunto, string> = {
  afe: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01"/>',
  aco: '<path d="M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8"/>',
  ent: '<path d="M1 3h15v13H1z M16 8h4l3 3v5h-7z M7.5 18.5a2 2 0 1 0-4 0a2 2 0 1 0 4 0z M20.5 18.5a2 2 0 1 0-4 0a2 2 0 1 0 4 0z"/>',
};
const CENTRO_CARACAS: LatLngExpression = [10.49, -66.88];

@Component({
  selector: 'app-seguimiento',
  imports: [RouterLink, PageHeader],
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.css',
})
export class Seguimiento {
  private readonly datos = inject(HumanitarianService);
  private readonly router = inject(Router);
  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('mapa');

  protected readonly seleccionado = injectFragment();
  protected readonly filtro = signal<TipoPunto | ''>('');
  protected readonly tipos: readonly TipoPunto[] = ['afe', 'aco', 'ent'];
  protected readonly etiqueta = (t: TipoPunto): string => ETIQUETAS[t];
  protected readonly ubicando = signal(0);
  protected readonly sinUbicar = signal<readonly string[]>([]);
  protected readonly mapaListo = signal(false);
  protected readonly errorMapa = signal<string | null>(null);

  private mapa: MapaLeaflet | null = null;
  private capa: LayerGroup | null = null;
  private leaflet: typeof import('leaflet') | null = null;
  private readonly marcadores = new Map<string, Marker>();
  private primeraVez = true;
  private readonly cacheGeo = new Map<string, Coordenadas | null>();

  /** Coordenadas conocidas: de la base de datos o de un enlace con `@lat,lng`. */
  private coordsDe(lat: number | null, lng: number | null, enlace: string): Coordenadas | null {
    if (lat !== null && lng !== null) return { lat, lng };
    return coordenadasDeEnlace(enlace);
  }

  private readonly base = computed(() => {
    const afectados = this.datos.afectados().map((a) => ({ a, pos: this.coordsDe(a.lat, a.lng, a.enlaceMaps) }));
    const acopios = this.datos.acopios().map((a) => ({ a, pos: this.coordsDe(a.lat, a.lng, a.enlaceMaps) }));
    return { afectados, acopios };
  });

  protected readonly puntos = computed<readonly Punto[]>(() => {
    const { afectados, acopios } = this.base();
    const pts: Punto[] = [];
    const ocupados = new Map<string, number>();
    /** Si varios puntos caen en el mismo lugar, los reparte en espiral para poder verlos y pulsarlos. */
    const separar = (pos: Coordenadas): Coordenadas => {
      const k = `${pos.lat.toFixed(3)},${pos.lng.toFixed(3)}`;
      const n = ocupados.get(k) ?? 0;
      ocupados.set(k, n + 1);
      if (n === 0) return pos;
      const angulo = n * 2.4;
      const radio = 0.004 * Math.ceil(n / 2) + 0.004;
      return { lat: pos.lat + radio * Math.sin(angulo), lng: pos.lng + radio * Math.cos(angulo) };
    };
    for (const { a, pos } of afectados) {
      if (pos) pts.push({ clave: `afe-${a.id}`, id: a.id, tipo: 'afe', nombre: a.titulo, ruta: RUTAS.afe, pos: separar(pos), detalle: `${a.tipoDesastre ?? 'Emergencia'} · prioridad ${etiquetaPrioridad(a.prioridad).toLowerCase()} · ${a.zona ?? ''}` });
    }
    for (const { a, pos } of acopios) {
      if (pos) pts.push({ clave: `aco-${a.id}`, id: a.id, tipo: 'aco', nombre: a.titulo, ruta: RUTAS.aco, pos: separar(pos), detalle: `Acopio · ${a.zona ?? ''}` });
    }
    return pts;
  });

  protected readonly trazados = computed<readonly Trazado[]>(() => {
    const porClave = new Map(this.puntos().map((p) => [p.clave, p.pos]));
    return this.datos
      .entregas()
      .filter((e) => e.estado !== 'Entregado' && e.idAfectado !== null)
      .flatMap((e) => {
        const desde = porClave.get(`aco-${e.idAcopio}`);
        const hasta = porClave.get(`afe-${e.idAfectado}`);
        return desde && hasta ? [{ clave: `ent-${e.id}`, codigo: e.codigo ?? `ENT-${e.id}`, estado: e.estado, desde, hasta }] : [];
      });
  });

  protected readonly visibles = computed<readonly Punto[]>(() => {
    const f = this.filtro();
    const base = this.puntos().filter((p) => !f || p.tipo === f);
    const ent: Punto[] = this.trazados()
      .filter(() => !f || f === 'ent')
      .map((t) => {
        const id = Number(t.clave.slice(4));
        return {
          clave: t.clave, id, tipo: 'ent' as const, nombre: t.codigo, ruta: RUTAS.ent,
          detalle: `${t.estado}`, pos: { lat: (t.desde.lat + t.hasta.lat) / 2, lng: (t.desde.lng + t.hasta.lng) / 2 },
        };
      });
    return [...base, ...ent];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.mapa?.remove());

    afterNextRender(async () => {
      try {
        // Leaflet es un paquete UMD: según el empaquetador, la API viene en `default`.
        const modulo = await import('leaflet');
        const L = ((modulo as unknown as { default?: typeof import('leaflet') }).default ?? modulo) as typeof import('leaflet');
        this.leaflet = L;
        this.mapa = L.map(this.contenedor().nativeElement, { center: CENTRO_CARACAS, zoom: 11, scrollWheelZoom: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.mapa);
        this.capa = L.layerGroup().addTo(this.mapa);
        this.mapaListo.set(true);
      } catch {
        this.errorMapa.set('No se pudo cargar el mapa. Revisa tu conexión a internet.');
      }
    });

    // Dibuja o actualiza los puntos cuando cambian los datos o el filtro.
    effect(() => {
      const puntos = this.visibles();
      const trazados = this.filtro() === '' || this.filtro() === 'ent' ? this.trazados() : [];
      if (this.mapaListo()) this.dibujar(puntos, trazados);
    });

    // Abre el popup del punto indicado en la URL (#afe-1, #aco-2, #ent-3).
    effect(() => {
      const clave = this.seleccionado();
      if (this.mapaListo() && clave) this.abrir(clave);
    });

    // Ubica con OpenStreetMap (Nominatim) las zonas que aún no tienen coordenadas.
    effect(() => {
      const { afectados, acopios } = this.base();
      const pendientes = [
        ...afectados.filter((x) => !x.pos).map((x) => ({ tabla: 'afe' as const, id: x.a.id, lugar: x.a.zona ?? x.a.titulo })),
        ...acopios.filter((x) => !x.pos).map((x) => ({ tabla: 'aco' as const, id: x.a.id, lugar: x.a.zona ?? x.a.titulo })),
      ];
      if (pendientes.length && !this.geocodificando) void this.ubicarPendientes(pendientes);
    });
  }

  private geocodificando = false;

  private async ubicarPendientes(lista: readonly { tabla: 'afe' | 'aco'; id: number; lugar: string }[]): Promise<void> {
    this.geocodificando = true;
    this.ubicando.set(lista.length);
    const fallidos: string[] = [];
    for (const item of lista) {
      try {
        if (!this.cacheGeo.has(item.lugar)) {
          this.cacheGeo.set(item.lugar, await geocodificar(item.lugar));
          await esperar(1100); // política de uso de Nominatim: 1 petición por segundo
        }
        const pos = this.cacheGeo.get(item.lugar);
        if (pos) await this.datos.guardarUbicacion(item.tabla, item.id, pos.lat, pos.lng);
        else fallidos.push(item.lugar);
      } catch {
        fallidos.push(item.lugar);
      }
      this.ubicando.update((n) => Math.max(0, n - 1));
    }
    this.sinUbicar.set([...new Set(fallidos)]);
    this.ubicando.set(0);
    this.geocodificando = false;
  }

  private dibujar(puntos: readonly Punto[], trazados: readonly Trazado[]): void {
    const L = this.leaflet;
    if (!L || !this.mapa || !this.capa) return;
    this.capa.clearLayers();
    this.marcadores.clear();

    for (const t of trazados) {
      L.polyline([[t.desde.lat, t.desde.lng], [t.hasta.lat, t.hasta.lng]], { color: '#92400e', weight: 3, dashArray: '8 8', opacity: 0.85 }).addTo(this.capa);
    }

    for (const p of puntos) {
      const icono = L.divIcon({
        className: `pin pin--${p.tipo}`,
        html: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[p.tipo]}</svg>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -14],
      });
      const m = L.marker([p.pos.lat, p.pos.lng], { icon: icono, title: `${ETIQUETAS[p.tipo]}: ${p.nombre}`, keyboard: true }).addTo(this.capa);
      m.bindPopup(this.contenidoPopup(p));
      this.marcadores.set(p.clave, m);
    }

    if (this.primeraVez && puntos.length) {
      this.primeraVez = false;
      const lims: LatLngBoundsExpression = puntos.map((p) => [p.pos.lat, p.pos.lng] as [number, number]);
      this.mapa.fitBounds(lims, { padding: [40, 40], maxZoom: 14 });
    }
    const sel = this.seleccionado();
    if (sel) this.abrir(sel);
  }

  /** Popup construido con nodos DOM (sin HTML de usuario). */
  private contenidoPopup(p: Punto): HTMLElement {
    const caja = document.createElement('div');
    const tipo = document.createElement('small');
    tipo.textContent = ETIQUETAS[p.tipo];
    const nombre = document.createElement('strong');
    nombre.textContent = p.nombre;
    nombre.style.display = 'block';
    const detalle = document.createElement('span');
    detalle.textContent = p.detalle;
    detalle.style.display = 'block';
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn';
    boton.textContent = 'Ver detalle';
    boton.addEventListener('click', () => void this.router.navigate([p.ruta], { fragment: p.clave }));
    boton.style.marginTop = '0.5rem';
    caja.append(tipo, nombre, detalle, boton);
    return caja;
  }

  private abrir(clave: string): void {
    const m = this.marcadores.get(clave);
    if (m && this.mapa) {
      this.mapa.setView(m.getLatLng(), Math.max(this.mapa.getZoom(), 14));
      m.openPopup();
    }
  }

  protected ruta(t: TipoPunto): string {
    return RUTAS[t];
  }
}
