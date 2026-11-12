import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { del, put } from '@vercel/blob';

/** Carpetas de fotos por tabla: reg = personas.registrados · afe = zona.afectado · aco = zona.acopio */
export const CARPETAS = ['reg', 'afe', 'aco'] as const;
export type Carpeta = (typeof CARPETAS)[number];

/** Carpeta local (solo desarrollo, cuando no hay BLOB_READ_WRITE_TOKEN). */
export const IMG_DIR = resolve(process.env['IMG_DIR'] ?? join(process.cwd(), 'img'));

const usaBlob = (): boolean => !!process.env['BLOB_READ_WRITE_TOKEN'];

/** Guarda la imagen y devuelve la dirección pública (Vercel Blob en la nube, /img/<carpeta>/ en local). */
export async function guardarFoto(carpeta: Carpeta, datos: Buffer, mime: string): Promise<string> {
  const nombre = `${randomUUID()}${mime === 'image/png' ? '.png' : '.jpg'}`;
  if (usaBlob()) {
    const r = await put(`${carpeta}/${nombre}`, datos, { access: 'public', contentType: mime, addRandomSuffix: false });
    return r.url;
  }
  mkdirSync(join(IMG_DIR, carpeta), { recursive: true });
  writeFileSync(join(IMG_DIR, carpeta, nombre), datos);
  return `/img/${carpeta}/${nombre}`;
}

/** Borra una foto previa solo si es un archivo propio (Blob o carpeta local); nunca enlaces ajenos. */
export async function borrarFoto(url: string | null | undefined, carpeta: Carpeta): Promise<void> {
  if (!url) return;
  try {
    if (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) {
      if (usaBlob()) await del(url);
      return;
    }
    const prefijo = `/img/${carpeta}/`;
    if (!url.startsWith(prefijo)) return;
    const ruta = resolve(IMG_DIR, carpeta, url.slice(prefijo.length));
    if (ruta.startsWith(resolve(IMG_DIR) + sep) && existsSync(ruta)) unlinkSync(ruta);
  } catch (e) {
    console.error('[fotos] No se pudo borrar la foto anterior:', e);
  }
}
