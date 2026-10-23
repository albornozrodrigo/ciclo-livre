import type { IsoDate } from '@/domain/dates';
import type { ClueImport } from '@/domain/clue/clue';
import { MAX_ITEMS } from '@/domain/export/format';
import { normalizeTagKey, TAG_LIMIT } from '@/domain/tracking/tags';

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

type Existing = { selections: Set<string>; measures: Set<string>; notes: Set<IsoDate>; dayTags: Set<string>; days: Set<IsoDate> };

async function loadExisting(db: SqlExecutor): Promise<Existing> {
  const [sel, mea, notes, tags] = await Promise.all([
    db.getAllAsync<{ date: IsoDate; category: string }>('SELECT DISTINCT date, category FROM log_selection'),
    db.getAllAsync<{ date: IsoDate; category: string }>('SELECT date, category FROM log_measure'),
    db.getAllAsync<{ date: IsoDate }>('SELECT date FROM log_note'),
    db.getAllAsync<{ date: IsoDate; key: string }>(
      'SELECT log_tag.date AS date, tag.key AS key FROM log_tag JOIN tag ON tag.id = log_tag.tag_id',
    ),
  ]);
  const days = new Set<IsoDate>([...sel, ...mea, ...notes, ...tags].map((r) => r.date));
  return {
    selections: new Set(sel.map((r) => `${r.date}|${r.category}`)),
    measures: new Set(mea.map((r) => `${r.date}|${r.category}`)),
    notes: new Set(notes.map((r) => r.date)),
    dayTags: new Set(tags.map((r) => `${r.date}|${r.key}`)),
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
  // Tag que já está naquele dia não conta como nova (a gravação ignoraria do mesmo jeito).
  const dayTags = data.dayTags.filter((t) => !existing.dayTags.has(`${t.date}|${normalizeTagKey(t.tag)}`));
  return { selections, measures, notes, dayTags, kept };
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
  if (p.dayTags.length) add('tags', p.dayTags.length);
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

/** A importação passaria do que a restauração aceita: o backup seguinte não voltaria. */
export class ClueLimitError extends Error {
  constructor() {
    super('limite');
  }
}

type Totals = { selections: number; measures: number; notes: number; dayTags: number; tags: number };

/** Totais acima dos limites da restauração (ver format.ts) tornariam o backup do app impossível de restaurar. */
export function exceedsRestoreLimits(t: Totals): boolean {
  return t.selections > MAX_ITEMS || t.measures > MAX_ITEMS || t.notes > MAX_ITEMS || t.dayTags > MAX_ITEMS || t.tags > TAG_LIMIT;
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
      // Conferido depois de gravar, dentro da transação: passar do limite desfaz tudo.
      const totals = await db.getFirstAsync<Totals>(
        `SELECT (SELECT COUNT(*) FROM log_selection) AS selections, (SELECT COUNT(*) FROM log_measure) AS measures,
                (SELECT COUNT(*) FROM log_note) AS notes, (SELECT COUNT(*) FROM log_tag) AS dayTags, (SELECT COUNT(*) FROM tag) AS tags`,
      );
      if (!totals || exceedsRestoreLimits(totals)) throw new ClueLimitError();
    }),
  );
}
