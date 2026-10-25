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
  lutealLength: 12,
  includeAtypical: true,
  babyBirth: null,
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

describe('migration v10 (modo pós-parto)', () => {
  it('mantém o perfil salvo antes e passa a aceitar o pós-parto com a data do parto', async () => {
    const db = openMemoryDatabase();
    await runMigrations(
      db,
      MIGRATIONS.filter((m) => m.version <= 9),
    );
    db.raw.exec(
      "INSERT INTO profile (id, birth_year, mode, last_period_start, period_length, cycle_length, regularity, birth_control, luteal_length, include_atypical, updated_at) VALUES (1, 1990, 'period', '2026-10-01', 5, 30, 'regular', 'pill', 12, 1, 'x')",
    );

    await runMigrations(db, MIGRATIONS);

    await expect(getProfile(db)).resolves.toMatchObject({
      mode: 'period',
      lastPeriodStart: '2026-10-01',
      cycleLength: 30,
      birthControl: 'pill',
      lutealLength: 12,
      includeAtypical: true,
      babyBirth: null,
    });
    const postpartum = { ...full, mode: 'postpartum' as const, dueDate: null, babyBirth: '2026-09-15' };
    await saveProfile(db, postpartum);
    await expect(getProfile(db)).resolves.toEqual(postpartum);
  });
});
