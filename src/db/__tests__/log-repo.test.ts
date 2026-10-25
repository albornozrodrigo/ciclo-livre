import { clearMeasure, getCategoryPrefs, getDay, saveCategoryPrefs, setMeasure, setNote, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';

import { openMemoryDatabase } from './node-sqlite-adapter';

const DAY = '2026-10-22';

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('log-repo › dia', () => {
  it('dia sem registro volta vazio', async () => {
    const db = await migratedDb();

    await expect(getDay(db, DAY)).resolves.toEqual({ selections: {}, measures: {}, note: null });
  });

  it('guarda seleções, medições e nota do dia e devolve igual', async () => {
    const db = await migratedDb();

    await setSelection(db, DAY, 'pain', ['cramps', 'headache']);
    await setSelection(db, DAY, 'period', ['medium']);
    await setMeasure(db, DAY, 'temperature', 36.55);
    await setNote(db, DAY, 'Cólica de manhã.');

    await expect(getDay(db, DAY)).resolves.toEqual({
      selections: { pain: ['cramps', 'headache'], period: ['medium'] },
      measures: { temperature: 36.55 },
      note: 'Cólica de manhã.',
    });
  });

  it('nova seleção da mesma categoria substitui a anterior; lista vazia limpa', async () => {
    const db = await migratedDb();
    await setSelection(db, DAY, 'pain', ['cramps']);

    await setSelection(db, DAY, 'pain', ['back']);
    expect((await getDay(db, DAY)).selections).toEqual({ pain: ['back'] });

    await setSelection(db, DAY, 'pain', []);
    expect((await getDay(db, DAY)).selections).toEqual({});
  });

  it('dias diferentes não se misturam', async () => {
    const db = await migratedDb();
    await setSelection(db, DAY, 'energy', ['low']);

    expect((await getDay(db, '2026-10-21')).selections).toEqual({});
  });

  it.each([
    ['categoria desconhecida', () => ['nao_existe', ['x']]],
    ['opção desconhecida', () => ['pain', ['inventada']]],
    ['duas opções numa categoria única', () => ['period', ['light', 'heavy']]],
    ['medição como seleção', () => ['temperature', ['36']]],
  ])('recusa %s sem gravar nada', async (_label, args) => {
    const db = await migratedDb();
    const [category, options] = args() as [string, string[]];

    await expect(setSelection(db, DAY, category, options)).rejects.toThrow();
    expect((await getDay(db, DAY)).selections).toEqual({});
  });

  it('recusa data malformada', async () => {
    const db = await migratedDb();

    await expect(setSelection(db, '22/10/2026', 'pain', ['cramps'])).rejects.toThrow();
  });

  it('medição fora da faixa é recusada; limpar remove', async () => {
    const db = await migratedDb();
    await expect(setMeasure(db, DAY, 'weight', 1000)).rejects.toThrow();

    await setMeasure(db, DAY, 'weight', 64.3);
    await clearMeasure(db, DAY, 'weight');

    expect((await getDay(db, DAY)).measures).toEqual({});
  });

  it('nota vazia ou só espaços apaga; nota longa demais é recusada', async () => {
    const db = await migratedDb();
    await setNote(db, DAY, 'algo');

    await setNote(db, DAY, '   ');
    expect((await getDay(db, DAY)).note).toBeNull();

    await expect(setNote(db, DAY, 'a'.repeat(1001))).rejects.toThrow();
  });

  it('texto com aspas é dado, não SQL', async () => {
    const db = await migratedDb();
    const text = "'); DROP TABLE log_note; --";

    await setNote(db, DAY, text);

    expect((await getDay(db, DAY)).note).toBe(text);
  });
});

describe('log-repo › preferências de categorias', () => {
  it('salva e devolve ordem e ocultas; salvar de novo atualiza as mesmas categorias', async () => {
    const db = await migratedDb();
    await saveCategoryPrefs(db, [
      { category: 'sleep', position: 0, hidden: false },
      { category: 'pain', position: 1, hidden: true },
    ]);

    await saveCategoryPrefs(db, [
      { category: 'pain', position: 0, hidden: false },
      { category: 'sleep', position: 1, hidden: false },
    ]);

    await expect(getCategoryPrefs(db)).resolves.toEqual([
      { category: 'pain', position: 0, hidden: false },
      { category: 'sleep', position: 1, hidden: false },
    ]);
  });
});

describe('log-repo › escritas concorrentes', () => {
  it('salvamentos disparados ao mesmo tempo não se atrapalham (sem transações aninhadas)', async () => {
    const db = await migratedDb();

    await Promise.all([
      setSelection(db, DAY, 'pain', ['cramps', 'headache']),
      setSelection(db, DAY, 'energy', ['low']),
      setMeasure(db, DAY, 'weight', 60),
      setNote(db, DAY, 'nota'),
      setSelection(db, DAY, 'feelings', ['calm', 'happy']),
    ]);

    await expect(getDay(db, DAY)).resolves.toEqual({
      selections: { pain: ['cramps', 'headache'], energy: ['low'], feelings: ['calm', 'happy'] },
      measures: { weight: 60 },
      note: 'nota',
    });
  });
});

describe('log-repo › preferências por modo', () => {
  it('salvar preferências de um modo não apaga as de categorias de outro modo', async () => {
    const db = await migratedDb();
    await saveCategoryPrefs(db, [{ category: 'pregnancy_body', position: 0, hidden: true }]);

    await saveCategoryPrefs(db, [{ category: 'pain', position: 0, hidden: false }]);

    expect((await getCategoryPrefs(db)).map((p) => p.category).sort()).toEqual(['pain', 'pregnancy_body']);
  });
});
