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

/** Dias com qualquer registro (opção, medição, nota ou tag) no intervalo, para marcar no calendário. */
export async function getLoggedDates(db: SqlExecutor, from: IsoDate, to: IsoDate): Promise<IsoDate[]> {
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT date FROM log_selection WHERE date BETWEEN ?1 AND ?2
     UNION SELECT date FROM log_measure WHERE date BETWEEN ?1 AND ?2
     UNION SELECT date FROM log_note WHERE date BETWEEN ?1 AND ?2
     UNION SELECT date FROM log_tag WHERE date BETWEEN ?1 AND ?2
     ORDER BY date`,
    from,
    to,
  );
  return rows.map((r) => r.date);
}

export type AnalysisData = {
  selections: { date: IsoDate; category: string; option: string }[];
  measures: Record<string, Record<IsoDate, number>>;
};

/** Tudo o que a Análise usa: seleções e medições (lido de uma vez, só no aparelho). */
export async function getAnalysisData(db: SqlExecutor): Promise<AnalysisData> {
  const [selections, measureRows] = await Promise.all([
    db.getAllAsync<{ date: string; category: string; option: string }>('SELECT date, category, option FROM log_selection ORDER BY date'),
    db.getAllAsync<{ date: string; category: string; value: number }>('SELECT date, category, value FROM log_measure ORDER BY date'),
  ]);
  const measures: Record<string, Record<IsoDate, number>> = {};
  for (const m of measureRows) (measures[m.category] ??= {})[m.date] = m.value;
  return { selections, measures };
}
