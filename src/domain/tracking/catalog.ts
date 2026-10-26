import type { BirthControl, Mode } from '@/domain/profile';

export type CategoryGroup = 'cycle' | 'body' | 'mind' | 'lifestyle' | 'health' | 'contraception' | 'pregnancy' | 'measures';

type Visibility = {
  /** Só aparece por padrão nestes modos. */
  onlyIn?: readonly Mode[];
  /** Não aparece por padrão nestes modos. */
  hiddenIn?: readonly Mode[];
  /** Categoria de contracepção: aparece se o perfil usa este método. */
  birthControl?: BirthControl;
};

export type ChoiceCategory = Visibility & {
  id: string;
  group: CategoryGroup;
  kind: 'single' | 'multi';
  options: readonly string[];
};

export type MeasureCategory = Visibility & {
  id: string;
  group: CategoryGroup;
  kind: 'measure';
  unit: string;
  min: number;
  max: number;
  decimals: number;
};

export type Category = ChoiceCategory | MeasureCategory;

const BLEEDING: readonly Mode[] = ['pregnancy', 'no_bleeding'];
const PREGNANCY: readonly Mode[] = ['pregnancy'];
const MENOPAUSE: readonly Mode[] = ['perimenopause', 'menopause'];

/**
 * Inventário funcional baseado no estudo de referência; ids, agrupamento e rótulos são próprios.
 * Só acrescente no fim de cada grupo; nunca renomeie um id (ele é a chave no banco).
 */
export const CATALOG: readonly Category[] = [
  // Ciclo
  { id: 'period', group: 'cycle', kind: 'single', options: ['light', 'medium', 'heavy', 'very_heavy'], hiddenIn: BLEEDING },
  { id: 'spotting', group: 'cycle', kind: 'single', options: ['red', 'brown'] },
  {
    id: 'collection_method',
    group: 'cycle',
    kind: 'multi',
    options: ['pad', 'tampon', 'cup', 'disc', 'period_underwear', 'liner'],
    hiddenIn: BLEEDING,
  },
  {
    id: 'pain',
    group: 'cycle',
    kind: 'multi',
    options: ['cramps', 'headache', 'ovulation', 'tender_breasts', 'back', 'joints', 'perineum'],
  },
  { id: 'pain_intensity', group: 'cycle', kind: 'single', options: ['mild', 'moderate', 'severe'] },
  { id: 'pms', group: 'cycle', kind: 'single', options: ['present'], hiddenIn: [...BLEEDING, 'menopause'] },
  {
    id: 'discharge',
    group: 'cycle',
    kind: 'multi',
    options: ['none', 'sticky', 'creamy', 'egg_white', 'watery', 'atypical', 'gray', 'clumpy_white'],
  },
  {
    id: 'sex',
    group: 'cycle',
    kind: 'multi',
    options: [
      'protected',
      'unprotected',
      'withdrawal',
      'high_desire',
      'low_desire',
      'solo',
      'none',
      'orgasm',
      'oral',
      'anal',
      'touch',
      'toys',
    ],
  },
  {
    id: 'tests',
    group: 'cycle',
    kind: 'multi',
    options: [
      'ovulation_positive',
      'ovulation_negative',
      'pregnancy_positive',
      'pregnancy_negative',
      'pregnancy_faint',
      'ovulation_other_method',
    ],
  },
  { id: 'hot_flashes', group: 'cycle', kind: 'multi', options: ['hot_flash', 'night_sweats', 'chills'], onlyIn: MENOPAUSE },
  { id: 'clots', group: 'cycle', kind: 'single', options: ['present'], hiddenIn: BLEEDING },
  { id: 'lochia', group: 'cycle', kind: 'single', options: ['none', 'bright_red', 'brown_pink', 'yellow_white'], onlyIn: ['postpartum'] },
  // Corpo
  { id: 'energy', group: 'body', kind: 'single', options: ['exhausted', 'low', 'good', 'high'] },
  { id: 'sleep', group: 'body', kind: 'single', options: ['under_3h', '3_6h', '6_9h', 'over_9h'] },
  { id: 'sleep_quality', group: 'body', kind: 'single', options: ['restless', 'ok', 'restful'] },
  { id: 'digestion', group: 'body', kind: 'multi', options: ['nausea', 'bloating', 'constipation', 'diarrhea', 'gas'] },
  { id: 'cravings', group: 'body', kind: 'multi', options: ['sweet', 'salty', 'carbs', 'chocolate'] },
  { id: 'skin', group: 'body', kind: 'multi', options: ['good', 'oily', 'dry', 'breakouts', 'hyperpigmentation', 'stretch_marks'] },
  { id: 'hair', group: 'body', kind: 'multi', options: ['good', 'oily', 'dry', 'hair_loss'] },
  {
    id: 'exercise',
    group: 'body',
    kind: 'multi',
    options: ['walking', 'running', 'cycling', 'swimming', 'yoga', 'strength', 'team_sport', 'dance'],
  },
  { id: 'mouth', group: 'body', kind: 'multi', options: ['bleeding_gums', 'burning_mouth'] },
  { id: 'breasts', group: 'body', kind: 'multi', options: ['nipple_discharge'] },
  { id: 'swelling', group: 'body', kind: 'multi', options: ['limbs', 'face', 'nasal'] },
  {
    id: 'lactation',
    group: 'body',
    kind: 'multi',
    options: ['engorgement', 'lump', 'pain', 'redness', 'cracked_nipples', 'leaking'],
    onlyIn: ['postpartum'],
  },
  {
    id: 'menopause_body',
    group: 'body',
    kind: 'multi',
    options: ['vaginal_dryness', 'painful_sex', 'urinary_urgency', 'urine_leaks', 'palpitations'],
    onlyIn: MENOPAUSE,
  },
  // Mente
  {
    id: 'feelings',
    group: 'mind',
    kind: 'multi',
    options: [
      'happy',
      'calm',
      'sensitive',
      'sad',
      'anxious',
      'irritable',
      'guilty',
      'apathetic',
      'confused',
      'obsessive_thoughts',
      'self_critical',
    ],
  },
  { id: 'mind', group: 'mind', kind: 'multi', options: ['focused', 'distracted', 'motivated', 'unmotivated', 'creative', 'foggy'] },
  { id: 'stress', group: 'mind', kind: 'single', options: ['low', 'moderate', 'high'] },
  { id: 'meditation', group: 'mind', kind: 'single', options: ['under_15m', '15_30m', 'over_30m'] },
  { id: 'self_care', group: 'mind', kind: 'multi', options: ['breathing', 'kegel', 'journaling'] },
  // Vida
  { id: 'social', group: 'lifestyle', kind: 'multi', options: ['supportive', 'conflict', 'social', 'withdrawn'] },
  { id: 'leisure', group: 'lifestyle', kind: 'multi', options: ['reading', 'screens', 'gaming', 'nature', 'music', 'travel'] },
  { id: 'substances', group: 'lifestyle', kind: 'multi', options: ['alcohol', 'tobacco', 'caffeine', 'hangover'] },
  { id: 'work', group: 'lifestyle', kind: 'single', options: ['light', 'normal', 'heavy'] },
  // Saúde
  {
    id: 'medication',
    group: 'health',
    kind: 'multi',
    options: ['painkiller', 'anti_inflammatory', 'antihistamine', 'antibiotic', 'supplement', 'hormone_therapy'],
  },
  { id: 'ailments', group: 'health', kind: 'multi', options: ['cold_flu', 'allergy', 'fever', 'injury', 'migraine'] },
  { id: 'appointments', group: 'health', kind: 'multi', options: ['gynecology', 'general', 'therapy', 'lab_tests', 'ultrasound'] },
  // Contracepção
  { id: 'bc_pill', group: 'contraception', kind: 'single', options: ['taken', 'late', 'missed', 'double'], birthControl: 'pill' },
  {
    id: 'bc_iud_hormonal',
    group: 'contraception',
    kind: 'multi',
    options: ['threads_checked', 'inserted', 'removed'],
    birthControl: 'iud_hormonal',
  },
  {
    id: 'bc_iud_copper',
    group: 'contraception',
    kind: 'multi',
    options: ['threads_checked', 'inserted', 'removed'],
    birthControl: 'iud_copper',
  },
  { id: 'bc_ring', group: 'contraception', kind: 'single', options: ['inserted', 'removed', 'replaced'], birthControl: 'ring' },
  { id: 'bc_patch', group: 'contraception', kind: 'single', options: ['applied', 'removed', 'replaced'], birthControl: 'patch' },
  { id: 'bc_implant', group: 'contraception', kind: 'single', options: ['inserted', 'removed', 'replaced'], birthControl: 'implant' },
  { id: 'bc_injection', group: 'contraception', kind: 'single', options: ['taken'], birthControl: 'injection' },
  // Gravidez
  { id: 'pregnancy_movements', group: 'pregnancy', kind: 'single', options: ['none', 'some', 'many'], onlyIn: PREGNANCY },
  {
    id: 'pregnancy_body',
    group: 'pregnancy',
    kind: 'multi',
    options: ['heartburn', 'swelling', 'braxton_hicks', 'round_ligament', 'leg_cramps'],
    onlyIn: PREGNANCY,
  },
  { id: 'pregnancy_breasts', group: 'pregnancy', kind: 'multi', options: ['tender', 'leaking', 'fuller'], onlyIn: PREGNANCY },
  { id: 'pregnancy_bladder', group: 'pregnancy', kind: 'multi', options: ['frequent', 'leaking'], onlyIn: PREGNANCY },
  {
    id: 'pregnancy_highs',
    group: 'pregnancy',
    kind: 'multi',
    options: ['strong_smell', 'energy_boost', 'glow', 'calm'],
    onlyIn: PREGNANCY,
  },
  // Medições
  { id: 'temperature', group: 'measures', kind: 'measure', unit: '°C', min: 34, max: 42, decimals: 2 },
  { id: 'weight', group: 'measures', kind: 'measure', unit: 'kg', min: 20, max: 300, decimals: 1 },
  { id: 'resting_heart_rate', group: 'measures', kind: 'measure', unit: 'bpm', min: 30, max: 220, decimals: 0 },
  { id: 'hrv', group: 'measures', kind: 'measure', unit: 'ms', min: 5, max: 300, decimals: 0 },
];

const BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export function categoryById(id: string): Category | undefined {
  return BY_ID.get(id);
}

/** Categorias mostradas por padrão para o modo e o método contraceptivo do perfil. */
export function defaultVisibleCategories(mode: Mode, birthControl: BirthControl | null): Category[] {
  return CATALOG.filter((c) => {
    if (c.birthControl) return c.birthControl === birthControl;
    if (c.onlyIn && !c.onlyIn.includes(mode)) return false;
    return !(c.hiddenIn && c.hiddenIn.includes(mode));
  });
}
