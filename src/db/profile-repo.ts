import type { Profile } from '@/domain/profile';

import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

type ProfileRow = {
  birth_year: number;
  mode: Profile['mode'];
  last_period_start: string | null;
  period_length: number;
  cycle_length: number;
  regularity: Profile['regularity'];
  due_date: string | null;
  trying_since: Profile['tryingSince'];
  birth_control: Profile['birthControl'];
  luteal_length: number | null;
  include_atypical: number;
};

export async function getProfile(db: SqlExecutor): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  if (!row) return null;
  return {
    birthYear: row.birth_year,
    mode: row.mode,
    lastPeriodStart: row.last_period_start,
    periodLength: row.period_length,
    cycleLength: row.cycle_length,
    regularity: row.regularity,
    dueDate: row.due_date,
    tryingSince: row.trying_since,
    birthControl: row.birth_control,
    lutealLength: row.luteal_length,
    includeAtypical: row.include_atypical === 1,
  };
}

/** Grava (ou substitui) o perfil. Espera um perfil já validado por `validateProfile`. */
export async function saveProfile(db: SqlExecutor, profile: Profile, now = new Date()): Promise<void> {
  await enqueueWrite(db, () =>
    db.runAsync(
      `INSERT INTO profile (id, birth_year, mode, last_period_start, period_length, cycle_length,
       regularity, due_date, trying_since, birth_control, luteal_length, include_atypical, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       birth_year = excluded.birth_year, mode = excluded.mode, last_period_start = excluded.last_period_start,
       period_length = excluded.period_length, cycle_length = excluded.cycle_length,
       regularity = excluded.regularity, due_date = excluded.due_date, trying_since = excluded.trying_since,
       birth_control = excluded.birth_control, luteal_length = excluded.luteal_length,
       include_atypical = excluded.include_atypical, updated_at = excluded.updated_at`,
      profile.birthYear,
      profile.mode,
      profile.lastPeriodStart,
      profile.periodLength,
      profile.cycleLength,
      profile.regularity,
      profile.dueDate,
      profile.tryingSince,
      profile.birthControl,
      profile.lutealLength,
      profile.includeAtypical ? 1 : 0,
      now.toISOString(),
    ),
  );
}
