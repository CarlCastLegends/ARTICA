// Función de Vercel única: vercel.json envía todas las rutas /api/* aquí.
// Vercel entrega la ruta original en el parámetro __ruta; la restauramos para que Express la reconozca.
import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server/app';

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const ruta = url.searchParams.get('__ruta');
  if (ruta !== null) {
    url.searchParams.delete('__ruta');
    req.url = `/api/${ruta.replace(/^\/+/, '')}${url.search}`;
  }
  app(req, res);
}
