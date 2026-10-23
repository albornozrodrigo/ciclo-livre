import { type IsoDate, isValidDate } from '@/domain/dates';
import { BIRTH_CONTROL, MODES, type Profile, REGULARITIES, TRYING_SINCE } from '@/domain/profile';
import { type Reminder, REMINDER_KINDS, validOptions, validTime } from '@/domain/reminders/catalog';
import { validateMessage } from '@/domain/reminders/message';
import { categoryById } from '@/domain/tracking/catalog';
import { type CategoryPref, validateMeasure, validateNote } from '@/domain/tracking/rules';
import { normalizeTagKey, TAG_LIMIT, validateTagName } from '@/domain/tracking/tags';

/** Mensagem única para qualquer arquivo recusado (sem detalhes internos). */
export const IMPORT_ERROR = 'Arquivo de exportação inválido ou de uma versão mais nova do app.';

/** Limite por lista: cobre décadas de registros diários e impede arquivo forjado gigante. */
export const MAX_ITEMS = 200_000;

export type Selection = { date: IsoDate; category: string; option: string };
export type Measure = { date: IsoDate; category: string; value: number };
export type Note = { date: IsoDate; text: string };
export type DayTag = { date: IsoDate; tag: string };

/** Formato aberto e versionado da exportação completa (JSON). */
export type ExportData = {
  format: 'ciclo-livre';
  version: 1;
  exportedAt: string;
  schema: number;
  profile: Profile | null;
  selections: Selection[];
  measures: Measure[];
  notes: Note[];
  tags: string[];
  dayTags: DayTag[];
  categoryPrefs: CategoryPref[];
  reminders: Reminder[];
  settings: { remindersDiscreet: boolean };
};

class Invalid extends Error {}
function check(condition: unknown): asserts condition {
  if (!condition) throw new Invalid();
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDate = (v: unknown): v is IsoDate => isValidDate(v);
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);
const nullOr = <T>(v: unknown, test: (x: unknown) => x is T): v is T | null => v === null || test(v);

function list(v: unknown): unknown[] {
  check(Array.isArray(v) && v.length <= MAX_ITEMS);
  return v;
}

function unique(keys: string[]) {
  check(new Set(keys).size === keys.length);
}

/** Perfil por estrutura (enums e faixas), sem regras relativas a hoje: backup antigo precisa restaurar. */
function profileOf(v: unknown): Profile | null {
  if (v === null) return null;
  check(isObject(v));
  const p = {
    birthYear: v.birthYear,
    mode: v.mode,
    lastPeriodStart: v.lastPeriodStart,
    periodLength: v.periodLength,
    cycleLength: v.cycleLength,
    regularity: v.regularity,
    dueDate: v.dueDate,
    tryingSince: v.tryingSince,
    birthControl: v.birthControl,
  };
  check(isInt(p.birthYear, 1900, 2100) && oneOf(MODES, p.mode) && nullOr(p.lastPeriodStart, isDate));
  check(isInt(p.periodLength, 1, 15) && isInt(p.cycleLength, 15, 90) && oneOf(REGULARITIES, p.regularity));
  check(nullOr(p.dueDate, isDate) && nullOr(p.tryingSince, (x): x is string => oneOf(TRYING_SINCE, x)));
  check(nullOr(p.birthControl, (x): x is string => oneOf(BIRTH_CONTROL, x)));
  return p as Profile;
}

function selectionsOf(v: unknown): Selection[] {
  const items = list(v).map((s) => {
    check(isObject(s) && isDate(s.date) && typeof s.category === 'string' && typeof s.option === 'string');
    const category = categoryById(s.category);
    check(category && category.kind !== 'measure' && category.options.includes(s.option));
    return { date: s.date, category: s.category, option: s.option };
  });
  unique(items.map((s) => `${s.date}|${s.category}|${s.option}`));
  // Escolha única: no máximo uma opção por dia.
  const singles = items.filter((s) => categoryById(s.category)?.kind === 'single').map((s) => `${s.date}|${s.category}`);
  unique(singles);
  return items;
}

function measuresOf(v: unknown): Measure[] {
  const items = list(v).map((m) => {
    check(isObject(m) && isDate(m.date) && typeof m.category === 'string' && typeof m.value === 'number');
    check(validateMeasure(m.category, m.value) === null);
    return { date: m.date, category: m.category, value: m.value };
  });
  unique(items.map((m) => `${m.date}|${m.category}`));
  return items;
}

function notesOf(v: unknown): Note[] {
  const items = list(v).map((n) => {
    check(isObject(n) && isDate(n.date) && typeof n.text === 'string' && validateNote(n.text) === null);
    return { date: n.date, text: n.text };
  });
  unique(items.map((n) => n.date));
  return items;
}

function tagsOf(v: unknown): string[] {
  const raws = list(v);
  check(raws.length <= TAG_LIMIT);
  const names: string[] = [];
  // Duplicata pela chave num conjunto: validar contra a lista inteira a cada tag era O(n²).
  const keys = new Set<string>();
  for (const raw of raws) {
    check(typeof raw === 'string');
    const result = validateTagName(raw, []);
    check(result.ok && result.name === raw);
    const key = normalizeTagKey(raw);
    check(!keys.has(key));
    keys.add(key);
    names.push(raw);
  }
  return names;
}

function dayTagsOf(v: unknown, tags: string[]): DayTag[] {
  const known = new Set(tags);
  const items = list(v).map((t) => {
    check(isObject(t) && isDate(t.date) && typeof t.tag === 'string' && known.has(t.tag));
    return { date: t.date, tag: t.tag };
  });
  unique(items.map((t) => `${t.date}|${normalizeTagKey(t.tag)}`));
  return items;
}

function prefsOf(v: unknown): CategoryPref[] {
  const items = list(v).map((p) => {
    check(isObject(p) && typeof p.category === 'string' && categoryById(p.category));
    check(isInt(p.position, 0, 1000) && typeof p.hidden === 'boolean');
    return { category: p.category, position: p.position, hidden: p.hidden };
  });
  unique(items.map((p) => p.category));
  return items;
}

function remindersOf(v: unknown): Reminder[] {
  const items = list(v).map((r) => {
    check(isObject(r) && oneOf(REMINDER_KINDS, r.kind) && typeof r.enabled === 'boolean');
    check(typeof r.time === 'string' && validTime(r.time) && isObject(r.options));
    const o = r.options;
    const options = { daysBefore: o.daysBefore, pack: o.pack, frequency: o.frequency, anchor: o.anchor, anchorFor: o.anchorFor };
    check(validOptions(options as Reminder['options']));
    check(nullOr(r.title, (x): x is string => typeof x === 'string') && nullOr(r.body, (x): x is string => typeof x === 'string'));
    const message = validateMessage(r.title, r.body);
    // Só aceita a mensagem já normalizada (aparada, nunca vazia), como o app grava.
    check(message.ok && message.title === r.title && message.body === r.body);
    return { kind: r.kind, enabled: r.enabled, time: r.time, options: options as Reminder['options'], title: r.title, body: r.body };
  });
  unique(items.map((r) => r.kind));
  return items;
}

/** Valida um arquivo de exportação inteiro. Qualquer problema recusa tudo com `IMPORT_ERROR`. */
export function parseExport(raw: unknown): ExportData {
  try {
    check(isObject(raw) && raw.format === 'ciclo-livre' && raw.version === 1);
    check(typeof raw.exportedAt === 'string' && isInt(raw.schema, 1, 1000));
    check(isObject(raw.settings) && typeof raw.settings.remindersDiscreet === 'boolean');
    // Sem perfil o app voltaria ao cadastro com lembretes antigos agendados: arquivo assim é recusado.
    check(raw.profile !== null);
    const tags = tagsOf(raw.tags);
    return {
      format: 'ciclo-livre',
      version: 1,
      exportedAt: raw.exportedAt,
      schema: raw.schema,
      profile: profileOf(raw.profile),
      selections: selectionsOf(raw.selections),
      measures: measuresOf(raw.measures),
      notes: notesOf(raw.notes),
      tags,
      dayTags: dayTagsOf(raw.dayTags, tags),
      categoryPrefs: prefsOf(raw.categoryPrefs),
      reminders: remindersOf(raw.reminders),
      settings: { remindersDiscreet: raw.settings.remindersDiscreet },
    };
  } catch {
    // O motivo exato não é exposto (arquivo vem de fora); a mensagem é sempre a mesma.
    throw new Error(IMPORT_ERROR);
  }
}
