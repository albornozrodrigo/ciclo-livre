import { exportAll, IMPORT_ERROR, importAll } from '@/db/export-repo';
import { TAG_LIMIT } from '@/domain/tracking/tags';
import { setMeasure, setNote, setSelection, saveCategoryPrefs } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import { saveReminder, setDiscreet } from '@/db/reminder-repo';
import { createTag, setDayTags } from '@/db/tag-repo';
import type { Profile } from '@/domain/profile';
import { defaultReminder } from '@/domain/reminders/catalog';

import { openMemoryDatabase } from './node-sqlite-adapter';

const NOW = new Date('2026-10-22T12:00:00Z');
const profile: Profile = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: '2026-10-12',
  periodLength: 5,
  cycleLength: 29,
  regularity: 'regular',
  dueDate: null,
  tryingSince: null,
  birthControl: 'pill',
};

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

async function seeded() {
  const db = await migratedDb();
  await saveProfile(db, profile, NOW);
  await setSelection(db, '2026-10-12', 'period', ['heavy']);
  await setSelection(db, '2026-10-12', 'pain', ['cramps', 'back']);
  await setMeasure(db, '2026-10-13', 'weight', 64.5);
  await setNote(db, '2026-10-13', 'Dia "difícil", com vírgula');
  const tag = await createTag(db, 'Plantão');
  await setDayTags(db, '2026-10-13', [tag.id]);
  await saveCategoryPrefs(db, [{ category: 'pain', position: 0, hidden: false }]);
  await saveReminder(db, { ...defaultReminder('period_due'), enabled: true, title: 'Oi' });
  await setDiscreet(db, true);
  return db;
}

describe('exportAll', () => {
  it('formato aberto e versionado, com tudo da pessoa', async () => {
    const data = await exportAll(await seeded(), NOW);
    expect(data).toMatchObject({ format: 'ciclo-livre', version: 1, exportedAt: NOW.toISOString(), schema: 6, profile });
    expect(data.selections).toEqual([
      { date: '2026-10-12', category: 'pain', option: 'back' },
      { date: '2026-10-12', category: 'pain', option: 'cramps' },
      { date: '2026-10-12', category: 'period', option: 'heavy' },
    ]);
    expect(data.measures).toEqual([{ date: '2026-10-13', category: 'weight', value: 64.5 }]);
    expect(data.notes).toEqual([{ date: '2026-10-13', text: 'Dia "difícil", com vírgula' }]);
    expect(data.tags).toEqual(['Plantão']);
    expect(data.dayTags).toEqual([{ date: '2026-10-13', tag: 'Plantão' }]);
    expect(data.settings).toEqual({ remindersDiscreet: true });
    expect(data.reminders.find((r) => r.kind === 'period_due')).toMatchObject({ enabled: true, title: 'Oi' });
  });
});

describe('importAll', () => {
  it('ida e volta: exportar, importar num banco vazio e exportar de novo dá o mesmo', async () => {
    const original = await exportAll(await seeded(), NOW);
    const target = await migratedDb();
    await importAll(target, JSON.parse(JSON.stringify(original)));
    expect(await exportAll(target, NOW)).toEqual(original);
  });

  it('substitui tudo o que havia', async () => {
    const target = await seeded();
    const empty = await exportAll(await migratedDb(), NOW);
    await importAll(target, { ...empty, profile });
    const after = await exportAll(target, NOW);
    expect(after.selections).toEqual([]);
    expect(after.tags).toEqual([]);
  });

  it('backup antigo (última menstruação de mais de um ano) ainda restaura', async () => {
    const original = await exportAll(await seeded(), NOW);
    const target = await migratedDb();
    await importAll(target, { ...original, profile: { ...profile, lastPeriodStart: '2024-01-01' } });
    expect((await exportAll(target, NOW)).profile?.lastPeriodStart).toBe('2024-01-01');
  });

  it.each([
    ['formato desconhecido', (d: Record<string, unknown>) => ({ ...d, format: 'outro' })],
    ['versão mais nova', (d: Record<string, unknown>) => ({ ...d, version: 2 })],
    [
      'opção fora do catálogo',
      (d: Record<string, unknown>) => ({ ...d, selections: [{ date: '2026-10-12', category: 'pain', option: 'x' }] }),
    ],
    [
      'duas opções numa categoria de escolha única',
      (d: Record<string, unknown>) => ({
        ...d,
        selections: [
          { date: '2026-10-12', category: 'period', option: 'heavy' },
          { date: '2026-10-12', category: 'period', option: 'light' },
        ],
      }),
    ],
    ['data impossível', (d: Record<string, unknown>) => ({ ...d, notes: [{ date: '2026-02-30', text: 'a' }] })],
    [
      'data absurda que quebraria as contas de ciclo (ano 9999)',
      (d: Record<string, unknown>) => ({ ...d, selections: [{ date: '9999-12-31', category: 'period', option: 'heavy' }] }),
    ],
    [
      'última menstruação no ano 0500',
      (d: Record<string, unknown>) => ({ ...d, profile: { ...(d.profile as object), lastPeriodStart: '0500-01-01' } }),
    ],
    [
      'medição fora da faixa',
      (d: Record<string, unknown>) => ({ ...d, measures: [{ date: '2026-10-12', category: 'weight', value: 9999 }] }),
    ],
    ['tag do dia inexistente', (d: Record<string, unknown>) => ({ ...d, dayTags: [{ date: '2026-10-12', tag: 'Nada' }] })],
    ['perfil com modo inválido', (d: Record<string, unknown>) => ({ ...d, profile: { ...profile, mode: 'x' } })],
    [
      'lembrete com horário inválido',
      (d: Record<string, unknown>) => ({ ...d, reminders: [{ ...defaultReminder('daily_log'), time: '99:99' }] }),
    ],
    ['não é objeto', () => 'texto'],
    [
      'mais tags do que o app permite criar',
      (d: Record<string, unknown>) => ({ ...d, tags: Array.from({ length: TAG_LIMIT + 1 }, (_, i) => `t${i}`), dayTags: [] }),
    ],
    ['tags repetidas (mesma chave sem acento)', (d: Record<string, unknown>) => ({ ...d, tags: ['Plantão', 'plantao'], dayTags: [] })],
  ])('recusa %s sem mudar nada', async (_name, mutate) => {
    const target = await seeded();
    const before = await exportAll(target, NOW);
    const bad = mutate(JSON.parse(JSON.stringify(before)) as Record<string, unknown>);
    await expect(importAll(target, bad)).rejects.toThrow(IMPORT_ERROR);
    expect(await exportAll(target, NOW)).toEqual(before);
  });

  it('arquivo forjado com 200 mil tags é recusado rápido (sem travar o app)', async () => {
    const target = await seeded();
    const data = JSON.parse(JSON.stringify(await exportAll(target, NOW)));
    data.tags = Array.from({ length: 200_000 }, (_, i) => `t${i}`);
    data.dayTags = [];
    const t0 = Date.now();
    await expect(importAll(target, data)).rejects.toThrow(IMPORT_ERROR);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('backup com 1500 tags (o app permite criar) restaura: todo backup gerado pelo app volta', async () => {
    const target = await migratedDb();
    const data = JSON.parse(JSON.stringify(await exportAll(await seeded(), NOW)));
    data.tags = [...data.tags, ...Array.from({ length: 1499 }, (_, i) => `t${i}`)];
    const t0 = Date.now();
    await importAll(target, data);
    expect(Date.now() - t0).toBeLessThan(5000);
    expect((await exportAll(target, NOW)).tags).toHaveLength(1500);
  });

  it('falha no meio da gravação desfaz tudo', async () => {
    const target = await seeded();
    const before = await exportAll(target, NOW);
    const data = JSON.parse(JSON.stringify(before));
    // Nota com 1001 caracteres passa pelo tipo mas viola o CHECK do banco só se a validação falhar; aqui a validação pega antes.
    data.notes = [{ date: '2026-10-12', text: 'x'.repeat(1001) }];
    await expect(importAll(target, data)).rejects.toThrow(IMPORT_ERROR);
    expect(await exportAll(target, NOW)).toEqual(before);
  });
});
