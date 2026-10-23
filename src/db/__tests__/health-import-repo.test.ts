import { exportAll, importAll } from '@/db/export-repo';
import { applyHealthImport } from '@/db/health-import-repo';
import { getHealthSettings, HEALTH_TYPES, markHealthImported, setHealthConnected, setHealthTypes } from '@/db/health-settings-repo';
import { setMeasure, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import type { HealthImport } from '@/domain/health/health-import';

import { openMemoryDatabase } from './node-sqlite-adapter';

const NOW = new Date('2026-10-23T12:00:00Z');

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
  days: 2,
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

  it('repetir não duplica nem muda nada', async () => {
    const db = await migratedDb();
    await applyHealthImport(db, data);
    const once = await exportAll(db, NOW);
    expect((await applyHealthImport(db, data)).added).toEqual({});
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
      },
      NOW,
    );
    await setHealthConnected(db, true);
    await setHealthTypes(db, ['weight', 'sleep']);
    await markHealthImported(db, NOW);
    expect(await getHealthSettings(db)).toEqual({ connected: true, types: ['sleep', 'weight'], lastImport: NOW.toISOString() });
    await expect(setHealthTypes(db, ['weight', 'steps' as never])).rejects.toThrow();
    await importAll(db, JSON.parse(JSON.stringify(await exportAll(db, NOW))));
    expect((await getHealthSettings(db)).connected).toBe(false);
  });
});
