import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { IMG_DIR, api } from './api/api';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

/** API REST (PostgreSQL). */
app.use('/api', api);

/** Fotos subidas: /img/reg (registrados), /img/afe (afectados), /img/aco (acopios). */
app.use(
  '/img',
  express.static(IMG_DIR, {
    maxAge: '1h',
    fallthrough: false,
    index: false,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }),
);

/** Archivos estáticos de la aplicación (JS, CSS, logo…). */
app.use(express.static(browserDistFolder, { maxAge: '1y', index: false, redirect: false }));

/** La aplicación se renderiza en el navegador (RenderMode.Client): Angular entrega el index. */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/** Arranca el servidor si este módulo es el punto de entrada (o se ejecuta con PM2). */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Servidor ARTICA en http://localhost:${port}`);
  });
}

/** Manejador usado por Angular CLI (servidor de desarrollo y compilación). */
export const reqHandler = createNodeRequestHandler(app);
