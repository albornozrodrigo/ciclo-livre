import type { IsoDate } from '@/domain/dates';
import type { ClueImport } from '@/domain/clue/clue';
import { normalizeTagKey } from '@/domain/tracking/tags';

import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

export type CluePreview = {
  range: ClueImport['range'];
  days: number;
  /** Dias do arquivo em que o app já tem algum registro. */
  existingDays: number;
  /** Itens que ficam de fora porque o app já tem aquela categoria naquele dia. */
  kept: number;
  /** O que entra, por categoria ('notes' e 'tags' incluídos). Maior primeiro. */
  byCategory: { category: string; count: number }[];
  unknown: { key: string; count: number }[];
  truncatedNotes: number;
};

type Existing = { selections: Set<string>; measures: Set<string>; notes: Set<IsoDate>; days: Set<IsoDate> };

async function loadExisting(db: SqlExecutor): Promise<Existing> {
  const [sel, mea, notes, tags] = await Promise.all([
    db.getAllAsync<{ date: IsoDate; category: string }>('SELECT DISTINCT date, category FROM log_selection'),
    db.getAllAsync<{ date: IsoDate; category: string }>('SELECT date, category FROM log_measure'),
    db.getAllAsync<{ date: IsoDate }>('SELECT date FROM log_note'),
    db.getAllAsync<{ date: IsoDate }>('SELECT DISTINCT date FROM log_tag'),
  ]);
  const days = new Set<IsoDate>([...sel, ...mea, ...notes, ...tags].map((r) => r.date));
  return {
    selections: new Set(sel.map((r) => `${r.date}|${r.category}`)),
    measures: new Set(mea.map((r) => `${r.date}|${r.category}`)),
    notes: new Set(notes.map((r) => r.date)),
    days,
  };
}

/** Separa o que entra do que fica de fora (o app vence no mesmo dia e categoria). */
function plan(data: ClueImport, existing: Existing) {
  const selections = data.selections.filter((s) => !existing.selections.has(`${s.date}|${s.category}`));
  const measures = data.measures.filter((m) => !existing.measures.has(`${m.date}|${m.category}`));
  const notes = data.notes.filter((n) => !existing.notes.has(n.date));
  const keptSlots = new Set(
    data.selections.filter((s) => existing.selections.has(`${s.date}|${s.category}`)).map((s) => `${s.date}|${s.category}`),
  );
  const kept = keptSlots.size + (data.measures.length - measures.length) + (data.notes.length - notes.length);
  return { selections, measures, notes, kept };
}

/** Só lê: mostra o que a importação faria. */
export async function previewClueImport(db: SqlExecutor, data: ClueImport): Promise<CluePreview> {
  const existing = await loadExisting(db);
  const p = plan(data, existing);
  const counts = new Map<string, number>();
  const add = (category: string, n = 1) => counts.set(category, (counts.get(category) ?? 0) + n);
  // Conta dias por categoria (uma dor com duas opções no mesmo dia é um dia).
  for (const slot of new Set(p.selections.map((s) => `${s.date}|${s.category}`))) add(slot.split('|')[1]);
  for (const m of p.measures) add(m.category);
  if (p.notes.length) add('notes', p.notes.length);
  if (data.dayTags.length) add('tags', data.dayTags.length);
  const importDays = new Set<IsoDate>([...data.selections, ...data.measures, ...data.notes, ...data.dayTags].map((r) => r.date));
  return {
    range: data.range,
    days: data.days,
    existingDays: [...importDays].filter((d) => existing.days.has(d)).length,
    kept: p.kept,
    byCategory: [...counts]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    unknown: Object.entries(data.unknown)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    truncatedNotes: data.truncatedNotes,
  };
}

/** Junta o histórico do Clue sem apagar nada, numa única transação (tudo ou nada). Só queries parametrizadas. */
export async function applyClueImport(db: SqlExecutor, data: ClueImport): Promise<void> {
  await enqueueWrite(db, () =>
    db.withTransactionAsync(async () => {
      const p = plan(data, await loadExisting(db));
      for (const s of p.selections) {
        await db.runAsync('INSERT OR IGNORE INTO log_selection (date, category, option) VALUES (?, ?, ?)', s.date, s.category, s.option);
      }
      for (const m of p.measures) {
        await db.runAsync('INSERT INTO log_measure (date, category, value) VALUES (?, ?, ?)', m.date, m.category, m.value);
      }
      for (const n of p.notes) {
        await db.runAsync('INSERT INTO log_note (date, text) VALUES (?, ?)', n.date, n.text);
      }
      const tagIds = new Map<string, number>();
      for (const name of data.tags) {
        const key = normalizeTagKey(name);
        await db.runAsync('INSERT OR IGNORE INTO tag (name, key) VALUES (?, ?)', name, key);
        const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM tag WHERE key = ?', key);
        if (!row) throw new Error('Tag não foi criada.');
        tagIds.set(key, row.id);
      }
      for (const t of data.dayTags) {
        const id = tagIds.get(normalizeTagKey(t.tag));
        if (id === undefined) throw new Error('Tag do dia sem cadastro.');
        await db.runAsync('INSERT OR IGNORE INTO log_tag (date, tag_id) VALUES (?, ?)', t.date, id);
      }
    }),
  );
}
