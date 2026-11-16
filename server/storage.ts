import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { del, put } from '@vercel/blob';
import { ErrorHttp } from './db';

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
    try {
      const subida = put(`${carpeta}/${nombre}`, datos, { access: 'public', contentType: mime, addRandomSuffix: false });
      subida.catch(() => undefined); // evita avisos si termina después del plazo
      const limite = new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('tiempo de espera agotado (20 s)')), 20_000));
      const r = await Promise.race([subida, limite]);
      return r.url;
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      console.error('[fotos] Vercel Blob rechazó la subida:', e);
      const pista = /private|public/i.test(detalle) ? ' Crea el Blob con acceso público (Public).' : '';
      throw new ErrorHttp(502, `No se pudo guardar la foto en Vercel Blob: ${detalle}${pista}`);
    }
  }
  // En Vercel el disco es de solo lectura: sin Blob no se puede guardar el archivo.
  if (process.env['VERCEL']) {
    throw new ErrorHttp(
      503,
      'Falta el almacenamiento de fotos: en Vercel entra a Storage → Create → Blob (acceso público), conéctalo a este proyecto y haz Redeploy. Mientras tanto puedes usar un enlace.',
    );
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
