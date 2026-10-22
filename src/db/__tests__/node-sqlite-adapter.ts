import { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/db/types';

/** SqlExecutor sobre node:sqlite, para testar SQL real fora do aparelho. */
export function openMemoryDatabase(): SqlExecutor & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  return {
    raw,
    execAsync: async (source) => {
      raw.exec(source);
    },
    getFirstAsync: async <T,>(source: string, ...params: (string | number | null)[]) =>
      (raw.prepare(source).get(...params) as T | undefined) ?? null,
    withTransactionAsync: async (task) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
