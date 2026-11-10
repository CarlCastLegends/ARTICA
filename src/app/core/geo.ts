/**
 * Proyección lineal sencilla para el esquema referencial del estado Zulia.
 * No sustituye a un mapa cartográfico: sirve para ubicar puntos de interés.
 */
const LAT_MAX = 11.5;
const LAT_MIN = 8.7;
const LNG_MIN = -73.0;
const LNG_MAX = -70.7;

/** Relación ancho/alto del esquema para que no se deforme. */
export const MAP_ASPECT = (((LNG_MAX - LNG_MIN) * Math.cos((10 * Math.PI) / 180)) / (LAT_MAX - LAT_MIN)).toFixed(3);

export interface MapPosition {
  readonly x: number;
  readonly y: number;
}

export function project(lat: number, lng: number): MapPosition {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/** Contorno aproximado del Lago de Maracaibo, como pares [lat, lng]. */
const LAKE: ReadonlyArray<readonly [number, number]> = [
  [10.95, -71.7], [10.95, -71.55], [10.75, -71.5], [10.55, -71.42], [10.35, -71.38],
  [10.15, -71.25], [9.95, -71.2], [9.7, -71.35], [9.45, -71.55], [9.2, -71.75],
  [9.05, -71.95], [9.15, -72.0], [9.45, -71.85], [9.7, -71.8], [9.95, -71.75],
  [10.2, -71.75], [10.45, -71.72], [10.62, -71.66], [10.8, -71.68],
];

export const LAKE_POINTS = LAKE.map(([lat, lng]) => {
  const p = project(lat, lng);
  return `${p.x},${p.y}`;
}).join(' ');
