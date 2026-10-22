import type { CycleSignals } from '@/domain/cycle/signals';
import type { IsoDate } from '@/domain/dates';

import type { SqlExecutor } from './types';

export type { CycleSignals };

const datesOf = async (db: SqlExecutor, sql: string, ...params: string[]) =>
  (await db.getAllAsync<{ date: string }>(sql, ...params)).map((r) => r.date);

/** Tudo o que o motor de previsão usa, lido de uma vez (escape não conta como fluxo). */
export async function getCycleSignals(db: SqlExecutor): Promise<CycleSignals> {
  const byOption = 'SELECT DISTINCT date FROM log_selection WHERE category = ? AND option = ? ORDER BY date';
  const [flowDates, eggWhiteDates, positiveOvulationTests, painDates, temps] = await Promise.all([
    datesOf(db, 'SELECT DISTINCT date FROM log_selection WHERE category = ? ORDER BY date', 'period'),
    datesOf(db, byOption, 'discharge', 'egg_white'),
    datesOf(db, byOption, 'tests', 'ovulation_positive'),
    datesOf(db, 'SELECT DISTINCT date FROM log_selection WHERE category = ? ORDER BY date', 'pain'),
    db.getAllAsync<{ date: string; value: number }>('SELECT date, value FROM log_measure WHERE category = ? ORDER BY date', 'temperature'),
  ]);
  const temperatures: Record<IsoDate, number> = {};
  for (const t of temps) temperatures[t.date] = t.value;
  return { flowDates, temperatures, eggWhiteDates, positiveOvulationTests, painDates };
}
