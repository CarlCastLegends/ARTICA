import { Pool, PoolClient, QueryResultRow, types } from 'pg';

try {
  process.loadEnvFile(); // lee .env en desarrollo; en Vercel las variables ya vienen definidas
} catch {
  /* sin .env */
}

// Números de PostgreSQL como números de JavaScript (bigint y numeric llegan como texto por defecto).
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => parseFloat(v));

export class ErrorHttp extends Error {
  constructor(readonly estado: number, mensaje: string) {
    super(mensaje);
  }
}

let pool: Pool | null = null;

function obtenerPool(): Pool {
  if (pool) return pool;
  const cadena = process.env['DATABASE_URL'] ?? process.env['POSTGRES_URL'];
  if (!cadena) {
    throw new ErrorHttp(503, 'Falta la variable DATABASE_URL con la cadena de conexión de PostgreSQL (Neon o Supabase).');
  }
  pool = new Pool({ connectionString: cadena, max: 3, idleTimeoutMillis: 10_000 });
  return pool;
}

export type Param = string | number | boolean | null | string[] | number[];

export async function todas<T extends QueryResultRow = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T[]> {
  return (await obtenerPool().query<T>(sql, params)).rows;
}

export async function una<T extends QueryResultRow = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T | undefined> {
  return (await todas<T>(sql, params))[0];
}

export async function ejecutar(sql: string, params: Param[] = []): Promise<number> {
  return (await obtenerPool().query(sql, params)).rowCount ?? 0;
}

export async function transaccion<T>(fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    const r = await fn(cliente);
    await cliente.query('COMMIT');
    return r;
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}

export async function cerrar(): Promise<void> {
  await pool?.end();
  pool = null;
}
