import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { createTag, deleteTag, getDayTags, listTags, renameTag, setDayTags, ensureTags } from '@/db/tag-repo';
import { TAG_LIMIT } from '@/domain/tracking/tags';

import { openMemoryDatabase } from './node-sqlite-adapter';

const DAY = '2026-10-22';

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('tag-repo', () => {
  it('cria e lista em ordem alfabética', async () => {
    const db = await migratedDb();
    await createTag(db, 'Viagem');
    await createTag(db, 'Academia');

    expect((await listTags(db)).map((t) => t.name)).toEqual(['Academia', 'Viagem']);
  });

  it('recusa nome inválido ou duplicado', async () => {
    const db = await migratedDb();
    await createTag(db, 'Café');

    await expect(createTag(db, 'cafe')).rejects.toThrow();
    await expect(createTag(db, '  ')).rejects.toThrow();
  });

  it(`no máximo ${TAG_LIMIT} tags: acima disso o backup não voltaria`, async () => {
    const db = await migratedDb();
    await db.execAsync(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${TAG_LIMIT}) INSERT INTO tag (name, key) SELECT 't' || i, 't' || i FROM n`,
    );
    await expect(createTag(db, 'Uma a mais')).rejects.toThrow('too_many');
  });

  it('renomeia mantendo as marcações dos dias', async () => {
    const db = await migratedDb();
    const tag = await createTag(db, 'Viajem');
    await setDayTags(db, DAY, [tag.id]);

    await renameTag(db, tag.id, 'Viagem');

    expect(await getDayTags(db, DAY)).toEqual([{ id: tag.id, name: 'Viagem' }]);
  });

  it('marca e desmarca tags num dia', async () => {
    const db = await migratedDb();
    const a = await createTag(db, 'A');
    const b = await createTag(db, 'B');

    await setDayTags(db, DAY, [a.id, b.id]);
    await setDayTags(db, DAY, [b.id]);

    expect(await getDayTags(db, DAY)).toEqual([{ id: b.id, name: 'B' }]);
  });

  it('excluir a tag remove dos dias', async () => {
    const db = await migratedDb();
    const tag = await createTag(db, 'Temporária');
    await setDayTags(db, DAY, [tag.id]);

    await deleteTag(db, tag.id);

    expect(await getDayTags(db, DAY)).toEqual([]);
    expect(await listTags(db)).toEqual([]);
  });

  it('recusa marcar tag que não existe', async () => {
    const db = await migratedDb();

    await expect(setDayTags(db, DAY, [999])).rejects.toThrow();
  });
});

describe('ensureTags (remédios viram tags do registro)', () => {
  it('cria só as que faltam, sem duplicar pela chave (maiúsculas e acentos)', async () => {
    const db = openMemoryDatabase();
    await runMigrations(db, MIGRATIONS);
    await createTag(db, 'Ferro');

    await ensureTags(db, ['ferro', 'Vitamina D', 'Vitamina D']);

    expect((await listTags(db)).map((t) => t.name)).toEqual(['Ferro', 'Vitamina D']);
  });
});
