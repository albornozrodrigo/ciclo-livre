import { type IsoDate, isValidDate } from '@/domain/dates';
import { categoryById } from '@/domain/tracking/catalog';
import { NOTE_MAX_LENGTH, validateMeasure } from '@/domain/tracking/rules';
import { normalizeTagKey, TAG_MAX_LENGTH } from '@/domain/tracking/tags';

/** Limites do arquivo do Clue: cobrem décadas de uso e barram arquivo forjado gigante. */
export const CLUE_LIMITS = { bytes: 50 * 1024 * 1024, records: 500_000, tags: 1000, optionsPerRecord: 50, unknownKeys: 50 } as const;

/** Busca só chaves próprias: nomes vindos do arquivo como "constructor" ou "__proto__" não acham nada herdado. */
function own<T>(table: Record<string, T>, key: string): { found: true; value: T } | { found: false } {
  return Object.prototype.hasOwnProperty.call(table, key) ? { found: true, value: table[key] } : { found: false };
}

export type ClueRecord = { type: string; date: IsoDate; value: unknown };

export type ClueImport = {
  selections: { date: IsoDate; category: string; option: string }[];
  measures: { date: IsoDate; category: string; value: number }[];
  notes: { date: IsoDate; text: string }[];
  tags: string[];
  dayTags: { date: IsoDate; tag: string }[];
  /** O que não tem par no app, contado por "tipo" ou "tipo:opção". Nada some em silêncio. */
  unknown: Record<string, number>;
  truncatedNotes: number;
  range: { from: IsoDate; to: IsoDate } | null;
  days: number;
};

export class ClueFormatError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Lê o measurements.json. Entradas sem tipo ou data válidos são contadas e ignoradas. */
export function parseClueMeasurements(text: string): { records: ClueRecord[]; invalid: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ClueFormatError('json');
  }
  if (!Array.isArray(raw)) throw new ClueFormatError('not_list');
  if (raw.length > CLUE_LIMITS.records) throw new ClueFormatError('too_many');
  const records: ClueRecord[] = [];
  let invalid = 0;
  for (const item of raw) {
    const date = isObject(item) && typeof item.date === 'string' ? item.date.slice(0, 10) : '';
    if (!isObject(item) || typeof item.type !== 'string' || item.type.length === 0 || item.type.length > 64 || !isValidDate(date)) {
      invalid += 1;
      continue;
    }
    records.push({ type: item.type, date, value: item.value });
  }
  return { records, invalid };
}

type Target = readonly [category: string, option: string];
const SKIP = null;

/** Clue → Ciclo Livre. Cada tipo aceita os nomes de opção que já apareceram em exportações reais. */
const OPTIONS: Record<string, Record<string, Target | typeof SKIP>> = {
  period: {
    light: ['period', 'light'],
    medium: ['period', 'medium'],
    heavy: ['period', 'heavy'],
    super_heavy: ['period', 'very_heavy'],
    very_heavy: ['period', 'very_heavy'],
    none: SKIP,
  },
  spotting: { red: ['spotting', 'red'], brown: ['spotting', 'brown'], spotting: ['spotting', 'red'] },
  collection_method: {
    pad: ['collection_method', 'pad'],
    tampon: ['collection_method', 'tampon'],
    cup: ['collection_method', 'cup'],
    menstrual_cup: ['collection_method', 'cup'],
    disc: ['collection_method', 'disc'],
    menstrual_disc: ['collection_method', 'disc'],
    period_underwear: ['collection_method', 'period_underwear'],
    liner: ['collection_method', 'liner'],
    panty_liner: ['collection_method', 'liner'],
  },
  pain: {
    period_cramps: ['pain', 'cramps'],
    cramps: ['pain', 'cramps'],
    headache: ['pain', 'headache'],
    ovulation: ['pain', 'ovulation'],
    ovulation_pain: ['pain', 'ovulation'],
    breast_tenderness: ['pain', 'tender_breasts'],
    tender_breasts: ['pain', 'tender_breasts'],
    lower_back: ['pain', 'back'],
    back: ['pain', 'back'],
    joint: ['pain', 'joints'],
    joints: ['pain', 'joints'],
    migraine: ['ailments', 'migraine'],
  },
  breasts_and_chest: {
    tender: ['pain', 'tender_breasts'],
    tender_breasts: ['pain', 'tender_breasts'],
    breast_tenderness: ['pain', 'tender_breasts'],
  },
  discharge: {
    none: ['discharge', 'none'],
    sticky: ['discharge', 'sticky'],
    creamy: ['discharge', 'creamy'],
    egg_white: ['discharge', 'egg_white'],
    eggwhite: ['discharge', 'egg_white'],
    watery: ['discharge', 'watery'],
    atypical: ['discharge', 'atypical'],
    unusual: ['discharge', 'atypical'],
  },
  sex_life: {
    protected: ['sex', 'protected'],
    protected_sex: ['sex', 'protected'],
    unprotected: ['sex', 'unprotected'],
    unprotected_sex: ['sex', 'unprotected'],
    withdrawal: ['sex', 'withdrawal'],
    high_sex_drive: ['sex', 'high_desire'],
    high_desire: ['sex', 'high_desire'],
    low_sex_drive: ['sex', 'low_desire'],
    low_desire: ['sex', 'low_desire'],
    masturbation: ['sex', 'solo'],
    solo: ['sex', 'solo'],
    no_sex: ['sex', 'none'],
  },
  tests: {
    ovulation_test_positive: ['tests', 'ovulation_positive'],
    ovulation_positive: ['tests', 'ovulation_positive'],
    ovulation_test_negative: ['tests', 'ovulation_negative'],
    ovulation_negative: ['tests', 'ovulation_negative'],
    pregnancy_test_positive: ['tests', 'pregnancy_positive'],
    pregnancy_positive: ['tests', 'pregnancy_positive'],
    pregnancy_test_negative: ['tests', 'pregnancy_negative'],
    pregnancy_negative: ['tests', 'pregnancy_negative'],
  },
  hot_flashes: {
    hot_flash: ['hot_flashes', 'hot_flash'],
    hot_flashes: ['hot_flashes', 'hot_flash'],
    night_sweats: ['hot_flashes', 'night_sweats'],
    chills: ['hot_flashes', 'chills'],
  },
  energy: {
    exhausted: ['energy', 'exhausted'],
    tired: ['energy', 'low'],
    ok: ['energy', 'good'],
    energetic: ['energy', 'high'],
    fully_energized: ['energy', 'high'],
  },
  sleep_quality: {
    restless: ['sleep_quality', 'restless'],
    poor: ['sleep_quality', 'restless'],
    ok: ['sleep_quality', 'ok'],
    restful: ['sleep_quality', 'restful'],
    good: ['sleep_quality', 'restful'],
  },
  digestion: {
    nauseous: ['digestion', 'nausea'],
    nausea: ['digestion', 'nausea'],
    bloated: ['digestion', 'bloating'],
    constipated: ['digestion', 'constipation'],
    diarrhea: ['digestion', 'diarrhea'],
    gassy: ['digestion', 'gas'],
  },
  craving: {
    sweet: ['cravings', 'sweet'],
    salty: ['cravings', 'salty'],
    carbs: ['cravings', 'carbs'],
    chocolate: ['cravings', 'chocolate'],
  },
  skin: {
    good: ['skin', 'good'],
    oily: ['skin', 'oily'],
    dry: ['skin', 'dry'],
    acne: ['skin', 'breakouts'],
    breakouts: ['skin', 'breakouts'],
  },
  hair: { good: ['hair', 'good'], oily: ['hair', 'oily'], dry: ['hair', 'dry'] },
  exercise: {
    walking: ['exercise', 'walking'],
    running: ['exercise', 'running'],
    biking: ['exercise', 'cycling'],
    cycling: ['exercise', 'cycling'],
    swimming: ['exercise', 'swimming'],
    yoga: ['exercise', 'yoga'],
    team_sports: ['exercise', 'team_sport'],
  },
  feelings: {
    happy: ['feelings', 'happy'],
    calm: ['feelings', 'calm'],
    sensitive: ['feelings', 'sensitive'],
    sad: ['feelings', 'sad'],
    anxious: ['feelings', 'anxious'],
    irritable: ['feelings', 'irritable'],
    irritated: ['feelings', 'irritable'],
  },
  mind: {
    focused: ['mind', 'focused'],
    distracted: ['mind', 'distracted'],
    motivated: ['mind', 'motivated'],
    unmotivated: ['mind', 'unmotivated'],
    creative: ['mind', 'creative'],
    foggy: ['mind', 'foggy'],
    calm: ['feelings', 'calm'],
    anxious: ['feelings', 'anxious'],
    stressed: ['stress', 'high'],
  },
  social_life: {
    supportive: ['social', 'supportive'],
    conflict: ['social', 'conflict'],
    sociable: ['social', 'social'],
    social: ['social', 'social'],
    withdrawn: ['social', 'withdrawn'],
  },
  medication: {
    pain_killer: ['medication', 'painkiller'],
    painkiller: ['medication', 'painkiller'],
    anti_inflammatory: ['medication', 'anti_inflammatory'],
    antihistamine: ['medication', 'antihistamine'],
    antibiotic: ['medication', 'antibiotic'],
    antibiotics: ['medication', 'antibiotic'],
    supplement: ['medication', 'supplement'],
    supplements: ['medication', 'supplement'],
  },
  ailments: {
    cold_flu: ['ailments', 'cold_flu'],
    cold_or_flu: ['ailments', 'cold_flu'],
    allergy: ['ailments', 'allergy'],
    fever: ['ailments', 'fever'],
    injury: ['ailments', 'injury'],
    migraine: ['ailments', 'migraine'],
  },
  appointments: {
    ob_gyn: ['appointments', 'gynecology'],
    gynecologist: ['appointments', 'gynecology'],
    gynecology: ['appointments', 'gynecology'],
    doctor: ['appointments', 'general'],
    general: ['appointments', 'general'],
    therapist: ['appointments', 'therapy'],
    therapy: ['appointments', 'therapy'],
    lab_tests: ['appointments', 'lab_tests'],
    ultrasound: ['appointments', 'ultrasound'],
  },
  // Contracepção. O DIU fica de fora: o arquivo não diz se é hormonal ou de cobre.
  pill: { taken: ['bc_pill', 'taken'], late: ['bc_pill', 'late'], missed: ['bc_pill', 'missed'], double: ['bc_pill', 'double'] },
  ring: { inserted: ['bc_ring', 'inserted'], removed: ['bc_ring', 'removed'], replaced: ['bc_ring', 'replaced'] },
  patch: { applied: ['bc_patch', 'applied'], removed: ['bc_patch', 'removed'], replaced: ['bc_patch', 'replaced'] },
  injection: { taken: ['bc_injection', 'taken'], injection: ['bc_injection', 'taken'] },
  implant: { inserted: ['bc_implant', 'inserted'], removed: ['bc_implant', 'removed'], replaced: ['bc_implant', 'replaced'] },
};

/** Nomes de tipo usados por versões diferentes do Clue. */
const TYPE_ALIASES: Record<string, string> = {
  cravings: 'craving',
  emotions: 'feelings',
  emotion: 'feelings',
  mental: 'mind',
  social: 'social_life',
  sex: 'sex_life',
  ailment: 'ailments',
  appointment: 'appointments',
  medications: 'medication',
  birth_control_pill: 'pill',
  bc_pill: 'pill',
  birth_control_ring: 'ring',
  birth_control_patch: 'patch',
  birth_control_injection: 'injection',
  birth_control_implant: 'implant',
};

const SEVERITY = ['mild', 'moderate', 'severe'] as const;

/** Extrai {option, severity} de qualquer formato de valor que o Clue usa. */
function optionsOf(value: unknown): { option: string; severity?: string }[] {
  const items = Array.isArray(value) ? value : [value];
  const out: { option: string; severity?: string }[] = [];
  for (const it of items) {
    if (typeof it === 'string') out.push({ option: it });
    else if (isObject(it) && typeof it.option === 'string') {
      const extent = isObject(it.extent) ? it.extent : null;
      out.push({ option: it.option, severity: typeof extent?.severity === 'string' ? extent.severity : undefined });
    }
  }
  return out;
}

function sleepBucket(minutes: number): string {
  if (minutes < 180) return 'under_3h';
  if (minutes < 360) return '3_6h';
  if (minutes <= 540) return '6_9h';
  return 'over_9h';
}

const round = (v: number, decimals: number) => Math.round(v * 10 ** decimals) / 10 ** decimals;

/** Converte os registros do Clue para o formato do app. Pura e determinística. */
export function mapClue(records: readonly ClueRecord[]): ClueImport {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const selections: ClueImport['selections'] = [];
  const seen = new Set<string>();
  const singleTaken = new Set<string>();
  const intensity = new Map<IsoDate, number>();
  const measures = new Map<string, ClueImport['measures'][number]>();
  const notes: ClueImport['notes'] = [];
  const noteByDay = new Map<IsoDate, ClueImport['notes'][number]>();
  const dayTagKeys = new Set<string>();
  const tagNames = new Map<string, string>();
  const dayTags: ClueImport['dayTags'] = [];
  const unknown = new Map<string, number>();
  const dates = new Set<IsoDate>();
  let truncatedNotes = 0;

  const miss = (key: string) => {
    // Arquivo forjado com milhões de nomes não pode encher a prévia: depois de 50 chaves, soma em "other".
    const slot = unknown.has(key) || unknown.size < CLUE_LIMITS.unknownKeys ? key : 'other';
    unknown.set(slot, (unknown.get(slot) ?? 0) + 1);
  };
  const select = (date: IsoDate, category: string, option: string) => {
    const key = `${date}|${category}|${option}`;
    if (seen.has(key)) return;
    const cat = categoryById(category);
    if (cat?.kind === 'single') {
      const slot = `${date}|${category}`;
      if (singleTaken.has(slot)) return;
      singleTaken.add(slot);
    }
    seen.add(key);
    selections.push({ date, category, option });
    dates.add(date);
  };
  const measure = (date: IsoDate, category: string, value: number, type: string) => {
    const cat = categoryById(category);
    if (!cat || cat.kind !== 'measure' || !Number.isFinite(value)) return miss(`${type}:invalid`);
    const v = round(value, cat.decimals);
    if (validateMeasure(category, v) !== null) return miss(`${type}:out_of_range`);
    const key = `${date}|${category}`;
    if (measures.has(key)) return;
    measures.set(key, { date, category, value: v });
    dates.add(date);
  };

  for (const r of sorted) {
    const alias = own(TYPE_ALIASES, r.type);
    const type = alias.found ? alias.value : r.type;
    const value = isObject(r.value) ? r.value : null;
    if (Array.isArray(r.value) && r.value.length > CLUE_LIMITS.optionsPerRecord) {
      miss(`${r.type}:too_many_options`);
      continue;
    }

    if (type === 'notes') {
      const text = typeof value?.text === 'string' ? value.text.trim() : '';
      if (!text) continue;
      const prev = noteByDay.get(r.date);
      if (prev) {
        // O app guarda uma nota por dia: junta as do mesmo dia.
        if (prev.text.length + 1 + text.length > NOTE_MAX_LENGTH) truncatedNotes += 1;
        prev.text = `${prev.text}\n${text}`.slice(0, NOTE_MAX_LENGTH);
        continue;
      }
      if (text.length > NOTE_MAX_LENGTH) truncatedNotes += 1;
      const note = { date: r.date, text: text.slice(0, NOTE_MAX_LENGTH) };
      notes.push(note);
      noteByDay.set(r.date, note);
      dates.add(r.date);
      continue;
    }
    if (type === 'tags') {
      for (const { option } of optionsOf(r.value)) {
        const name = option.trim().replace(/\s+/g, ' ').slice(0, TAG_MAX_LENGTH).trim();
        if (!name) continue;
        const key = normalizeTagKey(name);
        if (!tagNames.has(key)) {
          if (tagNames.size >= CLUE_LIMITS.tags) throw new ClueFormatError('too_many');
          tagNames.set(key, name);
        }
        const canonical = tagNames.get(key) as string;
        if (!dayTagKeys.has(`${r.date}|${key}`)) {
          dayTagKeys.add(`${r.date}|${key}`);
          dayTags.push({ date: r.date, tag: canonical });
        }
        dates.add(r.date);
      }
      continue;
    }
    if (type === 'sleep_duration') {
      const minutes = typeof value?.minutes === 'number' ? value.minutes : NaN;
      if (Number.isFinite(minutes) && minutes >= 0 && minutes <= 24 * 60) select(r.date, 'sleep', sleepBucket(minutes));
      else miss('sleep_duration:invalid');
      continue;
    }
    if (type === 'weight') {
      const kg =
        typeof value?.kilograms === 'number' ? value.kilograms : typeof value?.pounds === 'number' ? value.pounds * 0.45359237 : NaN;
      measure(r.date, 'weight', kg, type);
      continue;
    }
    if (type === 'temperature' || type === 'bbt') {
      const c =
        typeof value?.celsius === 'number'
          ? value.celsius
          : typeof value?.fahrenheit === 'number'
            ? ((value.fahrenheit - 32) * 5) / 9
            : NaN;
      measure(r.date, 'temperature', c, 'temperature');
      continue;
    }
    if (type === 'pms') {
      const opts = optionsOf(r.value);
      if (opts.length === 0 || opts.some((o) => o.option !== 'none' && o.option !== 'no')) select(r.date, 'pms', 'present');
      continue;
    }

    const entry = own(OPTIONS, type);
    if (!entry.found) {
      miss(r.type);
      continue;
    }
    const table = entry.value;
    for (const { option, severity } of optionsOf(r.value)) {
      const hit = own(table, option);
      if (!hit.found) {
        miss(`${r.type}:${option}`);
        continue;
      }
      const target = hit.value;
      if (target === SKIP) continue;
      select(r.date, target[0], target[1]);
      const level = SEVERITY.indexOf(severity as (typeof SEVERITY)[number]);
      if (type === 'pain' && level >= 0) intensity.set(r.date, Math.max(level, intensity.get(r.date) ?? -1));
    }
  }

  for (const [date, level] of intensity) select(date, 'pain_intensity', SEVERITY[level]);

  const allDates = [...dates].sort();
  return {
    selections,
    measures: [...measures.values()],
    notes,
    tags: [...tagNames.values()],
    dayTags,
    unknown: Object.fromEntries(unknown),
    truncatedNotes,
    range: allDates.length ? { from: allDates[0], to: allDates[allDates.length - 1] } : null,
    days: allDates.length,
  };
}
