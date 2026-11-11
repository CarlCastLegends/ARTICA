export interface Coordenadas {
  readonly lat: number;
  readonly lng: number;
}

/** Intenta leer coordenadas de un enlace de mapas (`@lat,lng`, `q=lat,lng` o `mlat/mlon`). */
export function coordenadasDeEnlace(enlace: string): Coordenadas | null {
  const patrones = [/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, /[?&](?:q|ll|query)=(-?\d{1,2}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/, /#map=\d+\/(-?\d{1,2}\.\d+)\/(-?\d{1,3}\.\d+)/];
  for (const re of patrones) {
    const m = re.exec(enlace);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

interface RespuestaNominatim {
  readonly lat: string;
  readonly lon: string;
}

/**
 * Geocodifica con la API de búsqueda de OpenStreetMap (Nominatim).
 * Política de uso: máximo 1 petición por segundo; quien llama debe espaciarlas.
 */
export async function geocodificar(lugar: string): Promise<Coordenadas | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ve&accept-language=es&q=${encodeURIComponent(`${lugar}, Venezuela`)}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) return null;
  const datos = (await respuesta.json()) as RespuestaNominatim[];
  if (!datos.length) return null;
  const lat = Number(datos[0].lat);
  const lng = Number(datos[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
