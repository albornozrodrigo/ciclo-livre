import { type IsoDate, toDayNumber } from '@/domain/dates';
import { normalizeTagKey, validateTagName } from '@/domain/tracking/tags';

import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

export type Tag = { id: number; name: string };

export async function listTags(db: SqlExecutor): Promise<Tag[]> {
  return db.getAllAsync<Tag>('SELECT id, name FROM tag ORDER BY key');
}

/** Valida o formato e checa duplicata só pela chave (sem ler a tabela inteira). */
async function validName(db: SqlExecutor, raw: string, exceptId?: number): Promise<string> {
  const result = validateTagName(raw, []);
  if (!result.ok) throw new Error(`Nome de tag inválido: ${result.error}.`);
  const clash = await db.getFirstAsync<{ id: number }>('SELECT id FROM tag WHERE key = ?', normalizeTagKey(result.name));
  if (clash && clash.id !== exceptId) throw new Error('Nome de tag inválido: duplicate.');
  return result.name;
}

export async function createTag(db: SqlExecutor, raw: string): Promise<Tag> {
  return enqueueWrite(db, async () => {
    const name = await validName(db, raw);
    await db.runAsync('INSERT INTO tag (name, key) VALUES (?, ?)', name, normalizeTagKey(name));
    const row = await db.getFirstAsync<Tag>('SELECT id, name FROM tag WHERE key = ?', normalizeTagKey(name));
    if (!row) throw new Error('Tag não foi criada.');
    return row;
  });
}

export async function renameTag(db: SqlExecutor, id: number, raw: string): Promise<void> {
  await enqueueWrite(db, async () => {
    const name = await validName(db, raw, id);
    await db.runAsync('UPDATE tag SET name = ?, key = ? WHERE id = ?', name, normalizeTagKey(name), id);
  });
}

/** Exclui a tag e, em cascata, as marcações dela nos dias. */
export async function deleteTag(db: SqlExecutor, id: number): Promise<void> {
  await enqueueWrite(db, () => db.runAsync('DELETE FROM tag WHERE id = ?', id));
}

export async function getDayTags(db: SqlExecutor, date: IsoDate): Promise<Tag[]> {
  return db.getAllAsync<Tag>(
    'SELECT tag.id, tag.name FROM log_tag JOIN tag ON tag.id = log_tag.tag_id WHERE log_tag.date = ? ORDER BY tag.key',
    date,
  );
}

/** Substitui as tags do dia. */
export async function setDayTags(db: SqlExecutor, date: IsoDate, tagIds: readonly number[]): Promise<void> {
  if (toDayNumber(date) === null) throw new Error('Data inválida.');
  await enqueueWrite(db, () =>
    db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM log_tag WHERE date = ?', date);
      for (const id of tagIds) {
        await db.runAsync('INSERT INTO log_tag (date, tag_id) VALUES (?, ?)', date, id);
      }
    }),
  );
}
