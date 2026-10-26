import { daysBetween, type IsoDate, isValidDate, yearOf } from './dates';

export const MODES = ['period', 'no_bleeding', 'conceive', 'pregnancy', 'perimenopause', 'postpartum', 'menopause'] as const;
export type Mode = (typeof MODES)[number];

export const REGULARITIES = ['regular', 'irregular', 'unknown'] as const;
export type Regularity = (typeof REGULARITIES)[number];

export const TRYING_SINCE = ['lt_1m', '1_3m', '4_6m', '7_9m', '10_12m', 'gt_12m'] as const;
export type TryingSince = (typeof TRYING_SINCE)[number];

export const BIRTH_CONTROL = [
  'none',
  'pill',
  'iud_hormonal',
  'iud_copper',
  'implant',
  'injection',
  'ring',
  'patch',
  'condom',
  'other',
  'prefer_not_to_say',
] as const;
export type BirthControl = (typeof BIRTH_CONTROL)[number];

export const LIMITS = {
  minAge: 18,
  maxAge: 100,
  periodLength: { min: 1, max: 15, default: 5 },
  cycleLength: { min: 15, max: 90, default: 28 },
  /** Fase lútea informada (opcional): do dia da ovulação até a véspera da menstruação (mesma conta do motor). */
  lutealLength: { min: 9, max: 18, default: 14 },
  lastPeriodMaxDaysAgo: 365,
  dueDateMaxDaysAhead: 300,
  /** Pós-parto: a data do parto vale por até um ano. */
  babyBirthMaxDaysAgo: 365,
  /** Menopausa: a última menstruação pode ter sido há muitos anos. */
  finalPeriodMaxYearsAgo: 50,
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
  /** null = não sei (o motor usa a medida pela temperatura ou 14 dias). */
  lutealLength: number | null;
  /** Ciclos fora do padrão entram nas previsões e no resumo (padrão: não). */
  includeAtypical: boolean;
  /** Pós-parto: data do parto (só neste modo). */
  babyBirth: IsoDate | null;
  /** Gravidez de gêmeos (só neste modo). */
  twins: boolean;
  /** Menopausa: data aproximada da última menstruação (só neste modo; null = não lembro). */
  finalPeriod: IsoDate | null;
};

export type ProfileInput = Pick<Profile, 'birthYear' | 'mode' | 'lastPeriodStart'> &
  Partial<Omit<Profile, 'birthYear' | 'mode' | 'lastPeriodStart'>>;

export type ProfileField = keyof Profile;
export type ProfileErrorCode =
  'under_18' | 'out_of_range' | 'invalid_date' | 'in_future' | 'too_old' | 'required' | 'not_shorter_than_cycle';
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
    lutealLength: input.lutealLength ?? null,
    includeAtypical: input.includeAtypical ?? false,
    babyBirth: input.mode === 'postpartum' ? (input.babyBirth ?? null) : null,
    twins: input.mode === 'pregnancy' ? (input.twins ?? false) : false,
    finalPeriod: input.mode === 'menopause' ? (input.finalPeriod ?? null) : null,
  };
}

/** Erro do ano de nascimento sozinho, para validar na própria tela do ano. */
export function validateBirthYear(birthYear: number, today: IsoDate): ProfileErrorCode | null {
  return checkBirthYear(birthYear, today)[0]?.code ?? null;
}

function checkBirthYear(birthYear: number, today: IsoDate): ProfileError[] {
  const yearsApart = yearOf(today) - birthYear;
  if (!Number.isInteger(birthYear) || yearsApart < 0 || yearsApart > LIMITS.maxAge) {
    return [{ field: 'birthYear', code: 'out_of_range' }];
  }
  // Só com o ano não dá para saber se o aniversário já passou: conta a idade mínima garantida.
  const guaranteedAge = yearsApart - 1;
  if (guaranteedAge < LIMITS.minAge) return [{ field: 'birthYear', code: 'under_18' }];
  return [];
}

function checkLastPeriod(value: IsoDate | null, today: IsoDate): ProfileError[] {
  if (value === null) return [];
  if (!isValidDate(value)) return [{ field: 'lastPeriodStart', code: 'invalid_date' }];
  const daysAgo = daysBetween(value, today);
  if (daysAgo < 0) return [{ field: 'lastPeriodStart', code: 'in_future' }];
  if (daysAgo > LIMITS.lastPeriodMaxDaysAgo) return [{ field: 'lastPeriodStart', code: 'too_old' }];
  return [];
}

function isWholeIn(value: number, range: { min: number; max: number }): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}

function checkLengths({ periodLength, cycleLength, lutealLength }: Profile): ProfileError[] {
  const errors: ProfileError[] = [];
  // A relação com o ciclo fica no motor (ciclo medido), não aqui: aqui travaria a edição sem aviso.
  if (lutealLength !== null && !isWholeIn(lutealLength, LIMITS.lutealLength)) {
    errors.push({ field: 'lutealLength', code: 'out_of_range' });
  }
  if (!isWholeIn(periodLength, LIMITS.periodLength)) errors.push({ field: 'periodLength', code: 'out_of_range' });
  if (!isWholeIn(cycleLength, LIMITS.cycleLength)) errors.push({ field: 'cycleLength', code: 'out_of_range' });
  if (errors.length === 0 && periodLength >= cycleLength) {
    errors.push({ field: 'periodLength', code: 'not_shorter_than_cycle' });
  }
  return errors;
}

/** Data mais antiga aceita para a última menstruação na menopausa (mesmo dia, 50 anos antes). */
export const finalPeriodOldest = (today: IsoDate): IsoDate => `${yearOf(today) - LIMITS.finalPeriodMaxYearsAgo}${today.slice(4)}`;

/** Opcional; datas AAAA-MM-DD comparadas como texto. */
function checkFinalPeriod(value: IsoDate | null, today: IsoDate): ProfileError[] {
  if (value === null) return [];
  if (!isValidDate(value)) return [{ field: 'finalPeriod', code: 'invalid_date' }];
  if (value > today) return [{ field: 'finalPeriod', code: 'in_future' }];
  if (value < finalPeriodOldest(today)) return [{ field: 'finalPeriod', code: 'too_old' }];
  return [];
}

function checkModeFields(profile: Profile, today: IsoDate): ProfileError[] {
  if (profile.mode === 'conceive' && profile.tryingSince === null) return [{ field: 'tryingSince', code: 'required' }];
  if (profile.mode === 'postpartum') return checkBabyBirth(profile.babyBirth, today);
  if (profile.mode === 'menopause') return checkFinalPeriod(profile.finalPeriod, today);
  if (profile.mode !== 'pregnancy') return [];
  if (profile.dueDate === null) return [{ field: 'dueDate', code: 'required' }];
  if (!isValidDate(profile.dueDate)) return [{ field: 'dueDate', code: 'invalid_date' }];
  const daysAhead = daysBetween(today, profile.dueDate);
  const inRange = daysAhead >= 0 && daysAhead <= LIMITS.dueDateMaxDaysAhead;
  return inRange ? [] : [{ field: 'dueDate', code: 'out_of_range' }];
}

function checkBabyBirth(value: IsoDate | null, today: IsoDate): ProfileError[] {
  if (value === null) return [{ field: 'babyBirth', code: 'required' }];
  if (!isValidDate(value)) return [{ field: 'babyBirth', code: 'invalid_date' }];
  const daysAgo = daysBetween(value, today);
  if (daysAgo < 0) return [{ field: 'babyBirth', code: 'in_future' }];
  return daysAgo > LIMITS.babyBirthMaxDaysAgo ? [{ field: 'babyBirth', code: 'too_old' }] : [];
}

/** Erros que dependem só da passagem do tempo (a data envelhece sozinha). */
const TIME_DEPENDENT: Partial<Record<ProfileField, ProfileErrorCode[]>> = {
  lastPeriodStart: ['too_old'],
  dueDate: ['out_of_range'],
  babyBirth: ['too_old'],
  finalPeriod: ['too_old'],
};

/**
 * Validação para editar um perfil já salvo: uma data que envelheceu e não foi mexida
 * não impede salvar outras mudanças. Datas novas continuam validadas por inteiro.
 */
export function validateProfileEdit(next: ProfileInput, previous: Profile, today: IsoDate): ValidationResult {
  const result = validateProfile(next, today);
  if (result.ok) return result;
  const errors = result.errors.filter((error) => {
    const unchanged = next[error.field] === previous[error.field];
    return !(unchanged && TIME_DEPENDENT[error.field]?.includes(error.code));
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, profile: withDefaults(next) };
}
