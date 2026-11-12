// Crea las tablas y los datos iniciales en la base PostgreSQL indicada en DATABASE_URL.
// Uso: npm run db:init   (es seguro repetirlo: no duplica datos ni borra nada)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

try {
  process.loadEnvFile();
} catch {
  /* sin .env */
}

const cadena = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!cadena) {
  console.error('Falta DATABASE_URL. Copia .env.example a .env y pega ahí la cadena de conexión de Neon o Supabase.');
  process.exit(1);
}

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'database', 'postgres');
const cliente = new pg.Client({ connectionString: cadena });

try {
  await cliente.connect();
  const { rows } = await cliente.query(`SELECT to_regclass('zona.afectado') AS tabla`);
  if (rows[0].tabla) {
    console.log('• Las tablas ya existen: se omite 01_webapp.sql (no se tocan tus datos).');
  } else {
    await cliente.query('BEGIN');
    await cliente.query(readFileSync(join(carpeta, '01_webapp.sql'), 'utf8'));
    await cliente.query('COMMIT');
    console.log('✔ Tablas y datos iniciales creados (01_webapp.sql).');
  }
  await cliente.query('BEGIN');
  await cliente.query(readFileSync(join(carpeta, '02_extensiones.sql'), 'utf8'));
  await cliente.query('COMMIT');
  console.log('✔ Columnas de la aplicación al día (02_extensiones.sql).');
} catch (e) {
  await cliente.query('ROLLBACK').catch(() => undefined);
  console.error('✘ No se pudo preparar la base de datos:', e.message);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
