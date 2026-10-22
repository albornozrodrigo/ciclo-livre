import { daysBetween, type IsoDate, toDayNumber, yearOf } from './dates';

export const MODES = ['period', 'no_bleeding', 'conceive', 'pregnancy', 'perimenopause'] as const;
export type Mode = (typeof MODES)[number];

export const REGULARITIES = ['regular', 'irregular', 'unknown'] as const;
export type Regularity = (typeof REGULARITIES)[number];

export const TRYING_SINCE = ['lt_1m', '1_3m', '4_6m', '7_9m', '10_12m', 'gt_12m'] as const;
export type TryingSince = (typeof TRYING_SINCE)[number];

export const BIRTH_CONTROL = [
  'none', 'pill', 'iud_hormonal', 'iud_copper', 'implant', 'injection', 'ring', 'patch', 'condom', 'other', 'prefer_not_to_say',
] as const;
export type BirthControl = (typeof BIRTH_CONTROL)[number];

export const LIMITS = {
  minAge: 18,
  maxAge: 100,
  periodLength: { min: 1, max: 15, default: 5 },
  cycleLength: { min: 15, max: 90, default: 28 },
  lastPeriodMaxDaysAgo: 365,
  dueDateMaxDaysAhead: 300,
} as const;

export type Profile = {
  birthYear: number;
  mode: Mode;
  lastPeriodStart: IsoDate | null;
  periodLength: number;
  cycleLength: number;
  regularity: Regularity;
  dueDate: IsoDate | null;
  tryingSince: TryingSince | null;
  birthControl: BirthControl | null;
};

export type ProfileInput = Pick<Profile, 'birthYear' | 'mode' | 'lastPeriodStart'> &
  Partial<Omit<Profile, 'birthYear' | 'mode' | 'lastPeriodStart'>>;

export type ProfileField = keyof Profile;
export type ProfileErrorCode =
  | 'under_18' | 'out_of_range' | 'invalid_date' | 'in_future' | 'too_old' | 'required' | 'not_shorter_than_cycle';
export type ProfileError = { field: ProfileField; code: ProfileErrorCode };

export type ValidationResult = { ok: true; profile: Profile } | { ok: false; errors: ProfileError[] };

/** Valida o que a pessoa informou e completa padrões. `today` é injetado para ser testável. */
export function validateProfile(input: ProfileInput, today: IsoDate): ValidationResult {
  const profile = withDefaults(input);
  const errors = [
    ...checkBirthYear(profile.birthYear, today),
    ...checkLastPeriod(profile.lastPeriodStart, today),
    ...checkLengths(profile),
    ...checkModeFields(profile, today),
  ];
  return errors.length > 0 ? { ok: false, errors } : { ok: true, profile };
}

function withDefaults(input: ProfileInput): Profile {
  return {
    birthYear: input.birthYear,
    mode: input.mode,
    lastPeriodStart: input.lastPeriodStart,
    periodLength: input.periodLength ?? LIMITS.periodLength.default,
    cycleLength: input.cycleLength ?? LIMITS.cycleLength.default,
    regularity: input.regularity ?? 'unknown',
    // Campos de um modo específico só valem nesse modo.
    dueDate: input.mode === 'pregnancy' ? (input.dueDate ?? null) : null,
    tryingSince: input.mode === 'conceive' ? (input.tryingSince ?? null) : null,
    birthControl: input.birthControl ?? null,
  };
}

/** Erro do ano de nascimento sozinho, para validar na própria tela do ano. */
export function validateBirthYear(birthYear: number, today: IsoDate): ProfileErrorCode | null {
  return checkBirthYear(birthYear, today)[0]?.code ?? null;
}

function checkBirthYear(birthYear: number, today: IsoDate): ProfileError[] {
  const age = yearOf(today) - birthYear;
  if (!Number.isInteger(birthYear) || age > LIMITS.maxAge) return [{ field: 'birthYear', code: 'out_of_range' }];
  if (age < LIMITS.minAge) return [{ field: 'birthYear', code: 'under_18' }];
  return [];
}

function checkLastPeriod(value: IsoDate | null, today: IsoDate): ProfileError[] {
  if (value === null) return [];
  if (toDayNumber(value) === null) return [{ field: 'lastPeriodStart', code: 'invalid_date' }];
  const daysAgo = daysBetween(value, today);
  if (daysAgo < 0) return [{ field: 'lastPeriodStart', code: 'in_future' }];
  if (daysAgo > LIMITS.lastPeriodMaxDaysAgo) return [{ field: 'lastPeriodStart', code: 'too_old' }];
  return [];
}

function isWholeIn(value: number, range: { min: number; max: number }): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}

function checkLengths({ periodLength, cycleLength }: Profile): ProfileError[] {
  const errors: ProfileError[] = [];
  if (!isWholeIn(periodLength, LIMITS.periodLength)) errors.push({ field: 'periodLength', code: 'out_of_range' });
  if (!isWholeIn(cycleLength, LIMITS.cycleLength)) errors.push({ field: 'cycleLength', code: 'out_of_range' });
  if (errors.length === 0 && periodLength >= cycleLength) {
    errors.push({ field: 'periodLength', code: 'not_shorter_than_cycle' });
  }
  return errors;
}

function checkModeFields(profile: Profile, today: IsoDate): ProfileError[] {
  if (profile.mode === 'conceive' && profile.tryingSince === null) return [{ field: 'tryingSince', code: 'required' }];
  if (profile.mode !== 'pregnancy') return [];
  if (profile.dueDate === null) return [{ field: 'dueDate', code: 'required' }];
  if (toDayNumber(profile.dueDate) === null) return [{ field: 'dueDate', code: 'invalid_date' }];
  const daysAhead = daysBetween(today, profile.dueDate);
  const inRange = daysAhead >= 0 && daysAhead <= LIMITS.dueDateMaxDaysAhead;
  return inRange ? [] : [{ field: 'dueDate', code: 'out_of_range' }];
}
