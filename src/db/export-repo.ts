import { type ExportData, parseExport } from '@/domain/export/format';
import { normalizeTagKey } from '@/domain/tracking/tags';

import { getCategoryPrefs } from './log-repo';
import { getProfile } from './profile-repo';
import { getDiscreet, listReminders } from './reminder-repo';
import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

export { IMPORT_ERROR } from '@/domain/export/format';

const DISCREET_KEY = 'reminders_discreet';

/** Tudo da pessoa em formato aberto e versionado. A chave do banco nunca entra. Ordem determinística. */
export async function exportAll(db: SqlExecutor, now: Date = new Date()): Promise<ExportData> {
  const [version, profile, selections, measures, notes, tags, dayTags, categoryPrefs, reminders, discreet] = await Promise.all([
    db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'),
    getProfile(db),
    db.getAllAsync<ExportData['selections'][number]>('SELECT date, category, option FROM log_selection ORDER BY date, category, option'),
    db.getAllAsync<ExportData['measures'][number]>('SELECT date, category, value FROM log_measure ORDER BY date, category'),
    db.getAllAsync<ExportData['notes'][number]>('SELECT date, text FROM log_note ORDER BY date'),
    db.getAllAsync<{ name: string }>('SELECT name FROM tag ORDER BY key'),
    db.getAllAsync<ExportData['dayTags'][number]>(
      'SELECT log_tag.date AS date, tag.name AS tag FROM log_tag JOIN tag ON tag.id = log_tag.tag_id ORDER BY log_tag.date, tag.key',
    ),
    getCategoryPrefs(db),
    listReminders(db),
    getDiscreet(db),
  ]);
  return {
    format: 'ciclo-livre',
    version: 1,
    exportedAt: now.toISOString(),
    schema: version?.user_version ?? 0,
    profile,
    selections,
    measures,
    notes,
    tags: tags.map((t) => t.name),
    dayTags,
    categoryPrefs,
    reminders,
    settings: { remindersDiscreet: discreet },
  };
}

/**
 * Restaura um arquivo exportado, substituindo TUDO numa única transação: valida antes,
 * e se qualquer gravação falhar nada muda. Só queries parametrizadas.
 */
export async function importAll(db: SqlExecutor, raw: unknown, now: Date = new Date()): Promise<void> {
  const data = parseExport(raw);
  await enqueueWrite(db, () =>
    db.withTransactionAsync(async () => {
      for (const table of ['log_tag', 'tag', 'log_selection', 'log_measure', 'log_note', 'category_pref', 'reminder', 'profile']) {
        // Nomes fixos acima (não vêm do arquivo).
        await db.runAsync(`DELETE FROM ${table}`);
      }
      await db.runAsync('DELETE FROM app_meta WHERE key = ?', DISCREET_KEY);

      const p = data.profile;
      if (p) {
        await db.runAsync(
          `INSERT INTO profile (id, birth_year, mode, last_period_start, period_length, cycle_length,
             regularity, due_date, trying_since, birth_control, updated_at)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          p.birthYear,
          p.mode,
          p.lastPeriodStart,
          p.periodLength,
          p.cycleLength,
          p.regularity,
          p.dueDate,
          p.tryingSince,
          p.birthControl,
          now.toISOString(),
        );
      }
      for (const s of data.selections) {
        await db.runAsync('INSERT INTO log_selection (date, category, option) VALUES (?, ?, ?)', s.date, s.category, s.option);
      }
      for (const m of data.measures) {
        await db.runAsync('INSERT INTO log_measure (date, category, value) VALUES (?, ?, ?)', m.date, m.category, m.value);
      }
      for (const n of data.notes) {
        await db.runAsync('INSERT INTO log_note (date, text) VALUES (?, ?)', n.date, n.text);
      }
      const tagIds = new Map<string, number>();
      for (const name of data.tags) {
        await db.runAsync('INSERT INTO tag (name, key) VALUES (?, ?)', name, normalizeTagKey(name));
        const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM tag WHERE key = ?', normalizeTagKey(name));
        if (!row) throw new Error('Tag não foi criada.');
        tagIds.set(name, row.id);
      }
      for (const t of data.dayTags) {
        await db.runAsync('INSERT INTO log_tag (date, tag_id) VALUES (?, ?)', t.date, tagIds.get(t.tag) ?? -1);
      }
      for (const pref of data.categoryPrefs) {
        await db.runAsync(
          'INSERT INTO category_pref (category, position, hidden) VALUES (?, ?, ?)',
          pref.category,
          pref.position,
          pref.hidden ? 1 : 0,
        );
      }
      for (const r of data.reminders) {
        await db.runAsync(
          'INSERT INTO reminder (kind, enabled, time, options, title, body) VALUES (?, ?, ?, ?, ?, ?)',
          r.kind,
          r.enabled ? 1 : 0,
          r.time,
          JSON.stringify(r.options),
          r.title,
          r.body,
        );
      }
      await db.runAsync('INSERT INTO app_meta (key, value) VALUES (?, ?)', DISCREET_KEY, data.settings.remindersDiscreet ? '1' : '0');
    }),
  );
}
