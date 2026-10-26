/** Datas de calendário como texto ISO 'AAAA-MM-DD', sem horário nem fuso. */
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Faixa das contas: larga o bastante para somar ciclos e gestação a qualquer data de entrada. */
const CALC_YEARS = { min: 1800, max: 2299 } as const;
/**
 * Faixa de entrada (arquivo restaurado, Clue, link, gravação). Ano 9999 ou 0500 vindos de fora quebravam
 * as contas de ciclo (o ano 10000 não cabe em AAAA); nenhum registro real fica fora disto.
 */
const INPUT_YEARS = { min: 1900, max: 2100 } as const;

/** Número de dias desde 1970-01-01 (UTC), ou null se a data não existe no calendário ou sai da faixa de contas. */
export function toDayNumber(value: IsoDate): number | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < CALC_YEARS.min || year > CALC_YEARS.max) return null;
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  const exists = back.getUTCFullYear() === year && back.getUTCMonth() === month - 1 && back.getUTCDate() === day;
  return exists ? ms / MS_PER_DAY : null;
}

/** Data que pode entrar no app: existe no calendário e fica entre 1900 e 2100. Use em toda fronteira. */
export function isValidDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || toDayNumber(value) === null) return false;
  const year = Number(value.slice(0, 4));
  return year >= INPUT_YEARS.min && year <= INPUT_YEARS.max;
}

/** Diferença em dias (b − a). Ambas precisam ser datas válidas. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const from = toDayNumber(a);
  const to = toDayNumber(b);
  if (from === null || to === null) throw new RangeError('Data inválida.');
  return to - from;
}

export function yearOf(value: IsoDate): number {
  return Number(value.slice(0, 4));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Primeiro dia do mês (mês 1–12). */
export const firstOfMonth = (year: number, month: number): IsoDate => `${year}-${pad(month)}-01`;

/** Data de calendário local (a que a pessoa vê no aparelho) como ISO. */
export function isoFromDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date local ao meio-dia: margem contra mudanças de horário de verão e fuso. */
export function dateFromIso(value: IsoDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const dayNumber = toDayNumber(value);
  if (dayNumber === null) throw new RangeError('Data inválida.');
  const d = new Date((dayNumber + days) * MS_PER_DAY);
  const year = d.getUTCFullYear();
  if (year < CALC_YEARS.min || year > CALC_YEARS.max) throw new RangeError('Data fora da faixa.');
  return `${year}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Hoje, como data de calendário local. */
export function todayIso(now: Date = new Date()): IsoDate {
  return isoFromDate(now);
}

/** Meses completos de calendário entre duas datas (0 se `to` vem antes). */
export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));
  return Math.max(0, Number(to.slice(8, 10)) < Number(from.slice(8, 10)) ? months - 1 : months);
}
