import { join } from 'node:path';
import express from 'express';
import app from './app';
import { IMG_DIR } from './storage';

/** Servidor de desarrollo: la API en el puerto 3000 y las fotos locales en /img (Angular las reenvía con proxy). */
const dev = express();
dev.use('/img', express.static(IMG_DIR, { index: false, fallthrough: false, setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));
dev.use(app);

const puerto = Number(process.env['API_PORT'] ?? 3000);
dev.listen(puerto, () => console.log(`API de ARTICA en http://localhost:${puerto} (fotos locales en ${join(IMG_DIR)})`));
