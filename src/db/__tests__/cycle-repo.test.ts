import { getAnalysisData, getCycleSignals, getLoggedDates } from '@/db/cycle-repo';
import { signalsFromAnalysis } from '@/domain/cycle/signals';
import { setMeasure, setNote, setSelection } from '@/db/log-repo';
import { createTag, setDayTags } from '@/db/tag-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';

import { openMemoryDatabase } from './node-sqlite-adapter';

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('getCycleSignals', () => {
  it('lê fluxo, temperaturas, muco, testes positivos e dor; escape fica à parte (fora do fluxo)', async () => {
    const db = await migratedDb();
    await setSelection(db, '2026-09-26', 'period', ['heavy']);
    await setSelection(db, '2026-09-27', 'period', ['medium']);
    await setSelection(db, '2026-09-20', 'spotting', ['brown']);
    await setMeasure(db, '2026-10-01', 'temperature', 36.4);
    await setSelection(db, '2026-10-09', 'discharge', ['egg_white', 'watery']);
    await setSelection(db, '2026-10-10', 'discharge', ['creamy']);
    await setSelection(db, '2026-10-08', 'tests', ['ovulation_positive', 'pregnancy_negative']);
    await setSelection(db, '2026-10-07', 'tests', ['ovulation_negative']);
    await setSelection(db, '2026-09-26', 'pain', ['cramps']);

    await expect(getCycleSignals(db)).resolves.toEqual({
      flowDates: ['2026-09-26', '2026-09-27'],
      spottingDates: ['2026-09-20'],
      temperatures: { '2026-10-01': 36.4 },
      eggWhiteDates: ['2026-10-09'],
      positiveOvulationTests: ['2026-10-08'],
      painDates: ['2026-09-26'],
      // Corrimento normal e testes não são sintomas.
      symptoms: [{ date: '2026-09-26', category: 'pain', option: 'cramps' }],
    });
  });

  it('os sinais tirados dos dados da Análise são os mesmos da leitura própria (uma leitura só basta)', async () => {
    const db = await migratedDb();
    await setSelection(db, '2026-09-27', 'period', ['medium']);
    await setSelection(db, '2026-09-26', 'period', ['heavy']);
    await setSelection(db, '2026-09-20', 'spotting', ['brown']);
    await setMeasure(db, '2026-10-01', 'temperature', 36.4);
    await setMeasure(db, '2026-10-02', 'weight', 64);
    await setSelection(db, '2026-10-09', 'discharge', ['egg_white', 'watery']);
    await setSelection(db, '2026-10-08', 'tests', ['ovulation_positive']);
    await setSelection(db, '2026-09-26', 'pain', ['cramps']);
    await setSelection(db, '2026-10-12', 'pain', ['cramps']);
    expect(signalsFromAnalysis(await getAnalysisData(db))).toEqual(await getCycleSignals(db));
  });

  it('banco vazio devolve listas vazias', async () => {
    const db = await migratedDb();

    await expect(getCycleSignals(db)).resolves.toEqual({
      flowDates: [],
      spottingDates: [],
      temperatures: {},
      eggWhiteDates: [],
      positiveOvulationTests: [],
      painDates: [],
      symptoms: [],
    });
  });
});

describe('getLoggedDates', () => {
  it('dias com qualquer registro (opção, medição, nota ou tag) dentro do intervalo', async () => {
    const db = await migratedDb();
    await setSelection(db, '2026-10-01', 'energy', ['low']);
    await setMeasure(db, '2026-10-02', 'weight', 60);
    await setNote(db, '2026-10-03', 'nota');
    const tag = await createTag(db, 'Viagem');
    await setDayTags(db, '2026-10-04', [tag.id]);
    await setSelection(db, '2026-11-01', 'energy', ['low']);

    await expect(getLoggedDates(db, '2026-10-01', '2026-10-31')).resolves.toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  });
});

describe('getAnalysisData', () => {
  it('todas as seleções e as medições por categoria', async () => {
    const db = await migratedDb();
    await setSelection(db, '2026-10-01', 'pain', ['cramps']);
    await setMeasure(db, '2026-10-01', 'weight', 60);
    await setMeasure(db, '2026-10-02', 'temperature', 36.5);

    const data = await getAnalysisData(db);

    expect(data.selections).toEqual([{ date: '2026-10-01', category: 'pain', option: 'cramps' }]);
    expect(data.measures).toEqual({ weight: { '2026-10-01': 60 }, temperature: { '2026-10-02': 36.5 } });
  });
});
