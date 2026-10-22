import { type IsoDate, toDayNumber } from '@/domain/dates';
import { categoryById } from '@/domain/tracking/catalog';
import { type CategoryPref, validateMeasure, validateNote } from '@/domain/tracking/rules';

import type { SqlExecutor } from './types';

export type DayLog = {
  selections: Record<string, string[]>;
  measures: Record<string, number>;
  note: string | null;
};

function assertDate(date: IsoDate) {
  if (toDayNumber(date) === null) throw new Error('Data inválida.');
}

/** Garante que a seleção existe no catálogo e respeita single/multi antes de tocar no banco. */
function assertSelection(categoryId: string, options: readonly string[]) {
  const category = categoryById(categoryId);
  if (!category || category.kind === 'measure') throw new Error('Categoria inválida.');
  if (options.some((o) => !category.options.includes(o))) throw new Error('Opção inválida.');
  if (category.kind === 'single' && options.length > 1) throw new Error('Categoria aceita uma opção.');
}

export async function getDay(db: SqlExecutor, date: IsoDate): Promise<DayLog> {
  assertDate(date);
  const selections: Record<string, string[]> = {};
  for (const row of await db.getAllAsync<{ category: string; option: string }>(
    'SELECT category, option FROM log_selection WHERE date = ? ORDER BY rowid',
    date,
  )) {
    (selections[row.category] ??= []).push(row.option);
  }
  const measures: Record<string, number> = {};
  for (const row of await db.getAllAsync<{ category: string; value: number }>(
    'SELECT category, value FROM log_measure WHERE date = ?',
    date,
  )) {
    measures[row.category] = row.value;
  }
  const note = await db.getFirstAsync<{ text: string }>('SELECT text FROM log_note WHERE date = ?', date);
  return { selections, measures, note: note?.text ?? null };
}

/** Substitui as opções de uma categoria no dia. Lista vazia limpa a categoria. */
export async function setSelection(db: SqlExecutor, date: IsoDate, categoryId: string, options: readonly string[]) {
  assertDate(date);
  assertSelection(categoryId, options);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM log_selection WHERE date = ? AND category = ?', date, categoryId);
    for (const option of options) {
      await db.runAsync('INSERT INTO log_selection (date, category, option) VALUES (?, ?, ?)', date, categoryId, option);
    }
  });
}

export async function setMeasure(db: SqlExecutor, date: IsoDate, categoryId: string, value: number) {
  assertDate(date);
  if (validateMeasure(categoryId, value) !== null) throw new Error('Medição inválida.');
  await db.runAsync(
    'INSERT INTO log_measure (date, category, value) VALUES (?, ?, ?) ON CONFLICT (date, category) DO UPDATE SET value = excluded.value',
    date,
    categoryId,
    value,
  );
}

export async function clearMeasure(db: SqlExecutor, date: IsoDate, categoryId: string) {
  assertDate(date);
  await db.runAsync('DELETE FROM log_measure WHERE date = ? AND category = ?', date, categoryId);
}

/** Nota vazia (ou só espaços) apaga a nota do dia. */
export async function setNote(db: SqlExecutor, date: IsoDate, text: string) {
  assertDate(date);
  const error = validateNote(text);
  if (error === 'empty') {
    await db.runAsync('DELETE FROM log_note WHERE date = ?', date);
    return;
  }
  if (error) throw new Error('Nota longa demais.');
  await db.runAsync(
    'INSERT INTO log_note (date, text) VALUES (?, ?) ON CONFLICT (date) DO UPDATE SET text = excluded.text',
    date,
    text,
  );
}

export async function getCategoryPrefs(db: SqlExecutor): Promise<CategoryPref[]> {
  const rows = await db.getAllAsync<{ category: string; position: number; hidden: number }>(
    'SELECT category, position, hidden FROM category_pref ORDER BY position',
  );
  return rows.map((r) => ({ category: r.category, position: r.position, hidden: r.hidden === 1 }));
}

export async function saveCategoryPrefs(db: SqlExecutor, prefs: readonly CategoryPref[]) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM category_pref');
    for (const p of prefs) {
      await db.runAsync('INSERT INTO category_pref (category, position, hidden) VALUES (?, ?, ?)', p.category, p.position, p.hidden ? 1 : 0);
    }
  });
}
