import { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor, SqlParam } from '@/db/types';

/** SqlExecutor sobre node:sqlite, para testar SQL real fora do aparelho. */
export function openMemoryDatabase(): SqlExecutor & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  return {
    raw,
    execAsync: async (source) => {
      raw.exec(source);
    },
    getFirstAsync: async <T>(source: string, ...params: SqlParam[]) => (raw.prepare(source).get(...params) as T | undefined) ?? null,
    getAllAsync: async <T>(source: string, ...params: SqlParam[]) => raw.prepare(source).all(...params) as T[],
    runAsync: async (source: string, ...params: SqlParam[]) => raw.prepare(source).run(...params),
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
