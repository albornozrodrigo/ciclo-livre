import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

const LOCK = 'sec_lock';
const HIDE = 'sec_hide_recents';

/** Proteção do aparelho: fica fora do backup e sobrevive a uma restauração. */
export type SecuritySettings = { lock: boolean; hideRecents: boolean };

const upsert = (db: SqlExecutor, key: string, on: boolean) =>
  enqueueWrite(db, () =>
    db.runAsync(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      key,
      on ? '1' : '0',
    ),
  );

export async function getSecuritySettings(db: SqlExecutor): Promise<SecuritySettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_meta WHERE key IN (?, ?)', LOCK, HIDE);
  const on = (key: string) => rows.some((r) => r.key === key && r.value === '1');
  return { lock: on(LOCK), hideRecents: on(HIDE) };
}

export const setAppLock = (db: SqlExecutor, on: boolean) => upsert(db, LOCK, on);
export const setHideRecents = (db: SqlExecutor, on: boolean) => upsert(db, HIDE, on);
