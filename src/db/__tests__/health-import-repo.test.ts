import { exportAll, importAll } from '@/db/export-repo';
import { applyHealthImport, removeHealthImported } from '@/db/health-import-repo';
import { getHealthSettings, HEALTH_TYPES, markHealthImported, setHealthConnected, setHealthTypes } from '@/db/health-settings-repo';
import { clearMeasure, setMeasure, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import type { HealthImport } from '@/domain/health/health-import';

import { openMemoryDatabase } from './node-sqlite-adapter';

const NOW = new Date('2026-10-23T12:00:00Z');
const PROFILE = {
  birthYear: 1990,
  mode: 'period',
  lastPeriodStart: '2026-10-01',
  periodLength: 5,
  cycleLength: 28,
  regularity: 'regular',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: false,
} as const;

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

const data: HealthImport = {
  measures: [
    { date: '2026-10-20', category: 'weight', value: 64 },
    { date: '2026-10-21', category: 'weight', value: 64.2 },
    { date: '2026-10-21', category: 'resting_heart_rate', value: 58 },
  ],
  selections: [
    { date: '2026-10-20', category: 'sleep', option: '6_9h' },
    { date: '2026-10-21', category: 'sleep', option: '3_6h' },
  ],
  dropped: 1,
};

describe('applyHealthImport', () => {
  it('junta sem sobrescrever o que a pessoa registrou; devolve o que entrou e o que ficou de fora', async () => {
    const db = await migratedDb();
    await setMeasure(db, '2026-10-20', 'weight', 65);
    await setSelection(db, '2026-10-21', 'sleep', ['6_9h']);
    const result = await applyHealthImport(db, data);
    expect(result).toEqual({ added: { weight: 1, resting_heart_rate: 1, sleep: 1 }, kept: 2, dropped: 1 });
    const out = await exportAll(db, NOW);
    expect(out.measures).toEqual([
      { date: '2026-10-20', category: 'weight', value: 65 },
      { date: '2026-10-21', category: 'resting_heart_rate', value: 58 },
      { date: '2026-10-21', category: 'weight', value: 64.2 },
    ]);
    expect(out.selections).toEqual([
      { date: '2026-10-20', category: 'sleep', option: '6_9h' },
      { date: '2026-10-21', category: 'sleep', option: '6_9h' },
    ]);
  });

  it('reimportar atualiza o que veio do Health Connect (dia que ainda estava em andamento), sem contar como "ficou de fora"', async () => {
    const db = await migratedDb();
    await applyHealthImport(db, data);
    const later: HealthImport = {
      measures: [{ date: '2026-10-21', category: 'resting_heart_rate', value: 55 }],
      selections: [{ date: '2026-10-21', category: 'sleep', option: '6_9h' }],
      dropped: 0,
    };
    expect(await applyHealthImport(db, later)).toEqual({ added: { resting_heart_rate: 1, sleep: 1 }, kept: 0, dropped: 0 });
    const out = await exportAll(db, NOW);
    expect(out.measures).toContainEqual({ date: '2026-10-21', category: 'resting_heart_rate', value: 55 });
    expect(out.selections).toContainEqual({ date: '2026-10-21', category: 'sleep', option: '6_9h' });
  });

  it('o que a pessoa editou ou apagou depois do import não volta', async () => {
    const db = await migratedDb();
    await applyHealthImport(db, data);
    await setMeasure(db, '2026-10-20', 'weight', 63);
    await clearMeasure(db, '2026-10-21', 'weight');
    const again: HealthImport = {
      measures: [
        { date: '2026-10-20', category: 'weight', value: 64.5 },
        { date: '2026-10-21', category: 'weight', value: 64.4 },
      ],
      selections: [],
      dropped: 0,
    };
    expect(await applyHealthImport(db, again)).toEqual({ added: {}, kept: 1, dropped: 0 });
    const weights = (await exportAll(db, NOW)).measures.filter((m) => m.category === 'weight');
    expect(weights).toEqual([{ date: '2026-10-20', category: 'weight', value: 63 }]);
  });

  it('só grava se ainda estiver conectado no momento da escrita (desconectar ou restaurar no meio da leitura)', async () => {
    const db = await migratedDb();
    expect(await applyHealthImport(db, data, { requireConnected: true, markAt: NOW })).toBeNull();
    expect((await exportAll(db, NOW)).measures).toEqual([]);
    expect((await getHealthSettings(db)).lastImport).toBeNull();
    await setHealthConnected(db, true);
    expect(await applyHealthImport(db, data, { requireConnected: true, markAt: NOW })).not.toBeNull();
    expect((await getHealthSettings(db)).lastImport).toBe(NOW.toISOString());
  });

  it('restaurar um backup esquece a origem: o que voltou do arquivo passa a ser da pessoa', async () => {
    const db = await migratedDb();
    await saveProfile(db, PROFILE, NOW);
    await applyHealthImport(db, data);
    await importAll(db, JSON.parse(JSON.stringify(await exportAll(db, NOW))));
    const changed: HealthImport = { measures: [{ date: '2026-10-20', category: 'weight', value: 70 }], selections: [], dropped: 0 };
    expect(await applyHealthImport(db, changed)).toEqual({ added: {}, kept: 1, dropped: 0 });
  });

  it('repetir não duplica nem muda nada', async () => {
    const db = await migratedDb();
    await applyHealthImport(db, data);
    const once = await exportAll(db, NOW);
    expect((await applyHealthImport(db, data))?.added).toEqual({});
    expect(await exportAll(db, NOW)).toEqual(once);
  });
});

describe('health-settings-repo', () => {
  it('padrão: desconectado, os 5 tipos marcados, sem import', async () => {
    expect(await getHealthSettings(await migratedDb())).toEqual({ connected: false, types: [...HEALTH_TYPES], lastImport: null });
  });

  it('conecta, escolhe tipos (só os conhecidos), marca o import; restaurar backup zera o estado', async () => {
    const db = await migratedDb();
    await saveProfile(
      db,
      {
        birthYear: 1990,
        mode: 'period',
        lastPeriodStart: '2026-10-01',
        periodLength: 5,
        cycleLength: 28,
        regularity: 'regular',
        dueDate: null,
        tryingSince: null,
        birthControl: null,
        lutealLength: null,
        includeAtypical: false,
        babyBirth: null,
        twins: false,
      },
      NOW,
    );
    await setHealthConnected(db, true);
    await setHealthTypes(db, ['weight', 'sleep']);
    await markHealthImported(db, NOW);
    expect(await getHealthSettings(db)).toEqual({ connected: true, types: ['sleep', 'weight'], lastImport: NOW.toISOString() });
    // Reconectar (talvez com tipos novos) volta a ler os 30 dias.
    await setHealthConnected(db, false);
    await setHealthConnected(db, true);
    expect((await getHealthSettings(db)).lastImport).toBeNull();
    await expect(setHealthTypes(db, ['weight', 'steps' as never])).rejects.toThrow();
    await importAll(db, JSON.parse(JSON.stringify(await exportAll(db, NOW))));
    expect((await getHealthSettings(db)).connected).toBe(false);
  });
});

describe('removeHealthImported', () => {
  it('apaga só o que ainda é do Health Connect; o que a pessoa editou ou registrou fica', async () => {
    const db = await migratedDb();
    await setMeasure(db, '2026-10-19', 'weight', 66);
    await applyHealthImport(db, data);
    await setMeasure(db, '2026-10-20', 'weight', 63.5);
    expect(await removeHealthImported(db)).toBe(4);
    const out = await exportAll(db, NOW);
    expect(out.measures).toEqual([
      { date: '2026-10-19', category: 'weight', value: 66 },
      { date: '2026-10-20', category: 'weight', value: 63.5 },
    ]);
    expect(out.selections).toEqual([]);
    // Depois de apagar, um novo import pode trazer de novo.
    expect((await applyHealthImport(db, data))?.added).toEqual({ resting_heart_rate: 1, sleep: 2, weight: 1 });
  });

  it('esquece o último import (a próxima leitura volta aos 30 dias) e mantém o que a pessoa apagou de propósito', async () => {
    const db = await migratedDb();
    await setHealthConnected(db, true);
    await applyHealthImport(db, data, { markAt: NOW });
    await clearMeasure(db, '2026-10-21', 'resting_heart_rate');
    await removeHealthImported(db);
    expect((await getHealthSettings(db)).lastImport).toBeNull();
    const again = await applyHealthImport(db, data);
    expect(again?.added).toEqual({ sleep: 2, weight: 2 });
    expect((await exportAll(db, NOW)).measures.some((m) => m.category === 'resting_heart_rate')).toBe(false);
  });
});
