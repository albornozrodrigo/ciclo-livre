/** Datas de calendário como texto ISO 'AAAA-MM-DD', sem horário nem fuso. */
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Número de dias desde 1970-01-01 (UTC), ou null se a data não existe no calendário. */
export function toDayNumber(value: IsoDate): number | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  const exists = back.getUTCFullYear() === year && back.getUTCMonth() === month - 1 && back.getUTCDate() === day;
  return exists ? ms / MS_PER_DAY : null;
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
