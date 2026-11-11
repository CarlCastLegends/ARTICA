export type ModoFoto = 'ninguna' | 'enlace' | 'archivo';

export interface FotoValor {
  readonly modo: ModoFoto;
  readonly enlace: string;
  readonly archivo: File | null;
}

export const FOTO_VACIA: FotoValor = { modo: 'ninguna', enlace: '', archivo: null };
export const TIPOS_FOTO = ['image/png', 'image/jpeg'];
export const MAX_FOTO = 5 * 1024 * 1024;

/** Devuelve un mensaje si la foto elegida no es válida; `null` si está bien (o si no hay foto). */
export function errorFoto(f: FotoValor): string | null {
  if (f.modo === 'enlace' && f.enlace.trim()) {
    try {
      const u = new URL(f.enlace.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch {
      return 'El enlace debe empezar con http:// o https://';
    }
  }
  if (f.modo === 'archivo' && f.archivo) {
    if (!TIPOS_FOTO.includes(f.archivo.type)) return 'Solo se aceptan imágenes .png, .jpg o .jpeg.';
    if (f.archivo.size > MAX_FOTO) return 'La foto no puede superar los 5 MB.';
  }
  return null;
}

type Campo = string | number | string[] | null | undefined;

/** Arma el FormData para la API: campos de texto + foto opcional (archivo o enlace). */
export function armarFormData(campos: Record<string, Campo>, foto?: FotoValor): FormData {
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    if (valor === null || valor === undefined || valor === '') continue;
    fd.append(clave, Array.isArray(valor) ? JSON.stringify(valor) : String(valor));
  }
  if (foto?.modo === 'archivo' && foto.archivo) fd.append('foto', foto.archivo);
  else if (foto?.modo === 'enlace' && foto.enlace.trim()) fd.append('fotoUrl', foto.enlace.trim());
  return fd;
}
