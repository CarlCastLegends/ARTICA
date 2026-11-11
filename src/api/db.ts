import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { SCHEMA_SQL } from './schema';

try {
  process.loadEnvFile(); // lee .env si existe
} catch {
  /* sin .env: se usan los valores por defecto */
}

// `node:sqlite` viene incluido en Node 22.13+; se carga en tiempo de ejecución para que el compilador no lo toque.
const requerir = createRequire(import.meta.url);
const { DatabaseSync } = requerir('node:sqlite') as typeof import('node:sqlite');

/** Archivo de la base de datos (se crea solo la primera vez). */
export const DB_PATH = resolve(process.env['SQLITE_PATH'] ?? join(process.cwd(), 'data', 'artica.db'));

mkdirSync(dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

const existe = db.prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'afectado'`).get();
if (!existe) {
  db.exec(SCHEMA_SQL);
  console.log(`[BD] Base de datos creada con los datos iniciales en ${DB_PATH}`);
}
db.exec('PRAGMA foreign_keys = ON;');

export type Fila = Record<string, unknown>;
export type Param = string | number | null;

export function todas(sql: string, ...params: Param[]): Fila[] {
  return db.prepare(sql).all(...params) as Fila[];
}

export function una(sql: string, ...params: Param[]): Fila | undefined {
  return db.prepare(sql).get(...params) as Fila | undefined;
}

export function ejecutar(sql: string, ...params: Param[]): { cambios: number; id: number } {
  const r = db.prepare(sql).run(...params);
  return { cambios: Number(r.changes), id: Number(r.lastInsertRowid) };
}

export function transaccion<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
