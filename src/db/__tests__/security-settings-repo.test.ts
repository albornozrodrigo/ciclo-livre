import { exportAll, importAll } from '@/db/export-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import { getSecuritySettings, setAppLock, setHideRecents } from '@/db/security-settings-repo';

import { openMemoryDatabase } from './node-sqlite-adapter';

const NOW = new Date('2026-10-23T12:00:00Z');

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('security-settings-repo', () => {
  it('padrão: sem trava e sem esconder nos recentes', async () => {
    expect(await getSecuritySettings(await migratedDb())).toEqual({ lock: false, hideRecents: false });
  });

  it('liga e desliga cada opção; restaurar um backup não desliga a proteção do aparelho', async () => {
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
      },
      NOW,
    );
    await setAppLock(db, true);
    await setHideRecents(db, true);
    expect(await getSecuritySettings(db)).toEqual({ lock: true, hideRecents: true });
    await importAll(db, JSON.parse(JSON.stringify(await exportAll(db, NOW))));
    expect(await getSecuritySettings(db)).toEqual({ lock: true, hideRecents: true });
    await setHideRecents(db, false);
    expect(await getSecuritySettings(db)).toEqual({ lock: true, hideRecents: false });
  });
});
