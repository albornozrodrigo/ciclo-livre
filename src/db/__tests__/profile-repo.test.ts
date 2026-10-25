import type { Profile } from '@/domain/profile';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { getProfile, saveProfile } from '@/db/profile-repo';

import { openMemoryDatabase } from './node-sqlite-adapter';

const full: Profile = {
  birthYear: 1990,
  mode: 'pregnancy',
  lastPeriodStart: '2026-08-01',
  periodLength: 6,
  cycleLength: 30,
  regularity: 'irregular',
  dueDate: '2027-05-08',
  tryingSince: null,
  birthControl: 'prefer_not_to_say',
};

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('profile-repo', () => {
  it('devolve null antes do onboarding', async () => {
    const db = await migratedDb();

    await expect(getProfile(db)).resolves.toBeNull();
  });

  it('preserva todos os campos na ida e volta, incluindo nulos', async () => {
    const db = await migratedDb();

    await saveProfile(db, full);

    await expect(getProfile(db)).resolves.toEqual(full);
  });

  it('salvar de novo substitui o perfil (linha única)', async () => {
    const db = await migratedDb();
    await saveProfile(db, full);
    const changed: Profile = { ...full, mode: 'period', dueDate: null, lastPeriodStart: null };

    await saveProfile(db, changed);

    await expect(getProfile(db)).resolves.toEqual(changed);
    expect(db.raw.prepare('SELECT count(*) AS n FROM profile').get()).toEqual({ n: 1 });
  });

  it('trata texto com aspas como dado, sem alterar a consulta', async () => {
    const db = await migratedDb();
    const hostile = { ...full, dueDate: "2027-05-08'); DROP TABLE profile; --" } as Profile;

    await expect(saveProfile(db, hostile)).rejects.toThrow();
    expect(db.raw.prepare("SELECT name FROM sqlite_master WHERE name='profile'").get()).toEqual({ name: 'profile' });
  });
});

describe('migration v2 (profile)', () => {
  it.each([
    [
      'id 2',
      "INSERT INTO profile (id, birth_year, mode, period_length, cycle_length, regularity, updated_at) VALUES (2, 1990, 'period', 5, 28, 'unknown', 'x')",
    ],
    [
      'modo inválido',
      "INSERT INTO profile (id, birth_year, mode, period_length, cycle_length, regularity, updated_at) VALUES (1, 1990, 'outro', 5, 28, 'unknown', 'x')",
    ],
    [
      'ciclo fora da faixa',
      "INSERT INTO profile (id, birth_year, mode, period_length, cycle_length, regularity, updated_at) VALUES (1, 1990, 'period', 5, 200, 'unknown', 'x')",
    ],
    [
      'data malformada',
      "INSERT INTO profile (id, birth_year, mode, last_period_start, period_length, cycle_length, regularity, updated_at) VALUES (1, 1990, 'period', '10/10/2026', 5, 28, 'unknown', 'x')",
    ],
  ])('recusa %s no próprio banco', async (_label, sql) => {
    const db = await migratedDb();

    expect(() => db.raw.exec(sql)).toThrow();
  });
});
