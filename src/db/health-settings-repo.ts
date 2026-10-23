import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

/** Tipos lidos do Health Connect (ids das categorias do app). */
export const HEALTH_TYPES = ['sleep', 'temperature', 'resting_heart_rate', 'hrv', 'weight'] as const;
export type HealthType = (typeof HEALTH_TYPES)[number];
export const isHealthType = (v: unknown): v is HealthType => typeof v === 'string' && (HEALTH_TYPES as readonly string[]).includes(v);

const CONNECTED = 'hc_connected';
const TYPES = 'hc_types';
const LAST = 'hc_last_import';

export type HealthSettings = { connected: boolean; types: HealthType[]; lastImport: string | null };

const upsert = (db: SqlExecutor, key: string, value: string) =>
  enqueueWrite(db, () =>
    db.runAsync('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', key, value),
  );

function parseTypes(raw: string | undefined): HealthType[] {
  if (raw === undefined) return [...HEALTH_TYPES];
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? HEALTH_TYPES.filter((t) => list.includes(t)) : [...HEALTH_TYPES];
  } catch {
    return [...HEALTH_TYPES];
  }
}

export async function getHealthSettings(db: SqlExecutor): Promise<HealthSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_meta WHERE key IN (?, ?, ?)',
    CONNECTED,
    TYPES,
    LAST,
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return { connected: map.get(CONNECTED) === '1', types: parseTypes(map.get(TYPES)), lastImport: map.get(LAST) ?? null };
}

/** Desconectar só para de importar: o que já entrou fica (são registros da pessoa). */
export const setHealthConnected = (db: SqlExecutor, connected: boolean) => upsert(db, CONNECTED, connected ? '1' : '0');

export async function setHealthTypes(db: SqlExecutor, types: readonly HealthType[]): Promise<void> {
  if (!types.every(isHealthType)) throw new Error('Tipo inválido.');
  await upsert(db, TYPES, JSON.stringify(HEALTH_TYPES.filter((t) => types.includes(t))));
}

export const markHealthImported = (db: SqlExecutor, now: Date = new Date()) => upsert(db, LAST, now.toISOString());
