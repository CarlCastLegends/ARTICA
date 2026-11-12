# ARTICA · Logística humanitaria y trazabilidad de donaciones

Angular 22 + TypeScript + CSS (página estática) · API en **funciones de Vercel** (Express) ·
base de datos **PostgreSQL en la nube (Neon o Supabase)** · fotos en **Vercel Blob** · mapa de **OpenStreetMap**.

```
src/app/      aplicación Angular (8 secciones)
api/          función de Vercel (todas las rutas /api/*)
server/       la API: rutas, base de datos y almacenamiento de fotos
database/postgres/   01_webapp.sql (tu base original) y 02_extensiones.sql
scripts/init-db.mjs  crea las tablas y datos iniciales en tu base
```

## 1. Base de datos (una sola vez)

1. Crea una base PostgreSQL gratuita: en tu proyecto de Vercel → **Storage → Create → Neon** (o usa Supabase).
2. Copia su cadena de conexión (la variable `DATABASE_URL`; en Neon usa la «pooled connection»).
3. En tu computador: `cp .env.example .env` y pega la cadena en `DATABASE_URL`.
4. Crea las tablas y los datos iniciales:
   ```bash
   npm install
   npm run db:init
   ```
   Es seguro repetirlo: si las tablas ya existen no toca tus datos.

## 2. Trabajar en local

```bash
npm start      # Angular en http://localhost:4200 + API en http://localhost:3000
```
Usa la misma base de la nube (no hay nada que instalar). Sin `BLOB_READ_WRITE_TOKEN`, las fotos subidas se guardan
en `img/reg`, `img/afe` e `img/aco` de tu computador.

## 3. Publicar en Vercel

1. Sube el proyecto a GitHub (la carpeta `node_modules`, `.env` y las fotos locales ya están en `.gitignore`).
2. En Vercel: **Add New → Project →** tu repositorio. Si te pide *Framework Preset*, elige **Other**
   (`vercel.json` ya define el comando de compilación y la carpeta de salida).
3. **Settings → Environment Variables:** añade `DATABASE_URL` (si usaste la integración de Neon, ya viene creada).
4. **Storage → Create → Blob**, conéctalo al proyecto: Vercel crea solo `BLOB_READ_WRITE_TOKEN`.
5. **Deployments → Redeploy.** Comprueba `https://tu-sitio.vercel.app/api/health` → debe responder `{"ok":true}`.

## Fotos

Cada formulario (zonas afectadas, zonas de acopio, personas) pide una foto **opcional**: sin foto (se usa un enlace gris),
**enlace**, o **archivo** `.png` / `.jpg` / `.jpeg` (máx. **4 MB**, límite de Vercel). Los archivos se guardan separados por tabla:

| Tabla | Carpeta |
|---|---|
| `personas.registrados` | `reg/` |
| `zona.afectado` | `afe/` |
| `zona.acopio` | `aco/` |

En Vercel Blob son carpetas dentro del almacenamiento (`reg/…`, `afe/…`, `aco/…`) y en la base queda la dirección pública.
Cada tarjeta permite **cambiar la foto** (la anterior se borra si era un archivo propio).

## Mapa

Mosaicos de `tile.openstreetmap.org`. Las zonas sin coordenadas se ubican con la búsqueda de OpenStreetMap (Nominatim,
1 consulta por segundo) y las coordenadas se guardan en la base. Los despachos no entregados se dibujan como línea
entre el acopio y la zona afectada.

## Antes de publicar de verdad

- La API **no tiene autenticación**: cualquiera puede crear registros. Añade inicio de sesión.
- Reemplaza los datos de contacto en `src/app/pages/nosotros/nosotros.ts`.
- Cambia `placehold.co` por tus propias imágenes grises si no quieres depender de un servicio externo.
