import { applyClueImport, previewClueImport } from '@/db/clue-import-repo';
import { exportAll } from '@/db/export-repo';
import { setMeasure, setNote, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { createTag, setDayTags } from '@/db/tag-repo';
import { type ClueImport, mapClue } from '@/domain/clue/clue';

import { openMemoryDatabase } from './node-sqlite-adapter';

const NOW = new Date('2026-10-22T12:00:00Z');
const rec = (type: string, date: string, value: unknown) => ({ type, date, value });

const clue: ClueImport = mapClue([
  rec('period', '2026-10-12', { option: 'medium' }),
  rec('period', '2026-10-13', { option: 'light' }),
  rec('pain', '2026-10-12', [{ option: 'headache' }]),
  rec('weight', '2026-10-13', { kilograms: 70 }),
  rec('weight', '2026-10-14', { kilograms: 71 }),
  rec('notes', '2026-10-13', { text: 'do Clue' }),
  rec('notes', '2026-10-14', { text: 'outra do Clue' }),
  rec('tags', '2026-10-14', [{ option: 'plantao' }, { option: 'Viagem' }]),
  rec('breasts_and_chest', '2026-10-14', [{ option: 'swollen_breasts' }]),
]);

async function seeded() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  await setSelection(db, '2026-10-12', 'period', ['heavy']);
  await setMeasure(db, '2026-10-13', 'weight', 64.5);
  await setNote(db, '2026-10-13', 'minha nota');
  const tag = await createTag(db, 'Plantão');
  await setDayTags(db, '2026-10-01', [tag.id]);
  return db;
}

describe('previewClueImport', () => {
  it('conta o que entra, o que fica de fora por já existir e os dias que já têm registro', async () => {
    const db = await seeded();
    const before = await exportAll(db, NOW);
    const p = await previewClueImport(db, clue);
    expect(p).toMatchObject({
      range: { from: '2026-10-12', to: '2026-10-14' },
      days: 3,
      existingDays: 2,
      kept: 3, // período de 12/10, peso de 13/10, nota de 13/10
      unknown: [{ key: 'breasts_and_chest:swollen_breasts', count: 1 }],
      truncatedNotes: 0,
    });
    expect(p.byCategory).toEqual(
      expect.arrayContaining([
        { category: 'period', count: 1 },
        { category: 'pain', count: 1 },
        { category: 'weight', count: 1 },
        { category: 'notes', count: 1 },
        { category: 'tags', count: 2 },
      ]),
    );
    expect(await exportAll(db, NOW)).toEqual(before); // prévia não grava nada
  });
});

describe('applyClueImport', () => {
  it('junta sem apagar: no mesmo dia e categoria vale o que já está no app', async () => {
    const db = await seeded();
    await applyClueImport(db, clue);
    const after = await exportAll(db, NOW);
    expect(after.selections).toEqual([
      { date: '2026-10-12', category: 'pain', option: 'headache' },
      { date: '2026-10-12', category: 'period', option: 'heavy' },
      { date: '2026-10-13', category: 'period', option: 'light' },
    ]);
    expect(after.measures).toEqual([
      { date: '2026-10-13', category: 'weight', value: 64.5 },
      { date: '2026-10-14', category: 'weight', value: 71 },
    ]);
    expect(after.notes).toEqual([
      { date: '2026-10-13', text: 'minha nota' },
      { date: '2026-10-14', text: 'outra do Clue' },
    ]);
    // "plantao" é a mesma tag que "Plantão" (sem acento, sem caixa): reaproveita.
    expect(after.tags).toEqual(['Plantão', 'Viagem']);
    expect(after.dayTags).toEqual([
      { date: '2026-10-01', tag: 'Plantão' },
      { date: '2026-10-14', tag: 'Plantão' },
      { date: '2026-10-14', tag: 'Viagem' },
    ]);
  });

  it('importar duas vezes não duplica nada', async () => {
    const db = await seeded();
    await applyClueImport(db, clue);
    const once = await exportAll(db, NOW);
    await applyClueImport(db, clue);
    expect(await exportAll(db, NOW)).toEqual(once);
  });

  it('tudo ou nada: se uma gravação falha, nada muda', async () => {
    const db = await seeded();
    const before = await exportAll(db, NOW);
    const broken: ClueImport = { ...clue, notes: [...clue.notes, { date: 'xx', text: 'quebra o CHECK' }] };
    await expect(applyClueImport(db, broken)).rejects.toThrow();
    expect(await exportAll(db, NOW)).toEqual(before);
  });
});
