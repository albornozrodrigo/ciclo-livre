import { type IsoDate, isValidDate } from '@/domain/dates';

/** Remédios do lembrete: até 5, cada um com 1 a 4 horários e término opcional. */
export const MED_LIMITS = { meds: 5, times: 4, name: 30 } as const;

export type Med = { name: string; times: string[]; until: IsoDate | null };

const validTime = (value: unknown) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function validMed(v: unknown): v is Med {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  const name = typeof m.name === 'string' ? m.name.trim() : '';
  const times = Array.isArray(m.times) ? m.times : [];
  return (
    name.length > 0 &&
    name.length <= MED_LIMITS.name &&
    times.length >= 1 &&
    times.length <= MED_LIMITS.times &&
    times.every(validTime) &&
    new Set(times).size === times.length &&
    (m.until === null || isValidDate(m.until))
  );
}

export function validMeds(v: unknown): v is Med[] {
  return Array.isArray(v) && v.length <= MED_LIMITS.meds && v.every(validMed);
}
