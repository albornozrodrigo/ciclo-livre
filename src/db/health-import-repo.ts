import type { HealthImport } from '@/domain/health/health-import';

import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

export type HealthImportResult = {
  /** O que entrou, por categoria. */
  added: Record<string, number>;
  /** Dias em que a pessoa já tinha registrado aquela categoria (vale o app). */
  kept: number;
  dropped: number;
};

/** Grava o que veio do Health Connect numa transação, sem sobrescrever o que já existe no mesmo dia e categoria. */
export async function applyHealthImport(db: SqlExecutor, data: HealthImport): Promise<HealthImportResult> {
  return enqueueWrite(db, async () => {
    const added: Record<string, number> = {};
    let kept = 0;
    const bump = (category: string) => {
      added[category] = (added[category] ?? 0) + 1;
    };
    await db.withTransactionAsync(async () => {
      for (const m of data.measures) {
        const exists = await db.getFirstAsync('SELECT 1 FROM log_measure WHERE date = ? AND category = ?', m.date, m.category);
        if (exists) {
          kept += 1;
          continue;
        }
        await db.runAsync('INSERT INTO log_measure (date, category, value) VALUES (?, ?, ?)', m.date, m.category, m.value);
        bump(m.category);
      }
      for (const s of data.selections) {
        const exists = await db.getFirstAsync('SELECT 1 FROM log_selection WHERE date = ? AND category = ?', s.date, s.category);
        if (exists) {
          kept += 1;
          continue;
        }
        await db.runAsync('INSERT INTO log_selection (date, category, option) VALUES (?, ?, ?)', s.date, s.category, s.option);
        bump(s.category);
      }
    });
    return { added, kept, dropped: data.dropped };
  });
}
