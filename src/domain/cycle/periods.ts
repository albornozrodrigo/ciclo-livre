import { addDays, daysBetween, type IsoDate } from '@/domain/dates';

export type Period = { start: IsoDate; end: IsoDate; source: 'logged' | 'seed' };

/** Até este buraco (dias sem registro entre dois dias de fluxo) ainda é a mesma menstruação. */
const MAX_GAP_DAYS = 1;
/** Semente do onboarding é descartada se há menstruação registrada a até esta distância. */
const SEED_MATCH_DAYS = 7;

/**
 * Agrupa dias com fluxo em menstruações. Escape não entra aqui (quem chama passa só fluxo).
 * A semente (última menstruação informada no onboarding) completa o histórico quando não há registro.
 */
export function detectPeriods(flowDates: readonly IsoDate[], seed: { start: IsoDate; length: number } | null): Period[] {
  const dates = [...new Set(flowDates)].sort();
  const periods: Period[] = [];
  for (const date of dates) {
    const last = periods.at(-1);
    if (last && daysBetween(last.end, date) <= MAX_GAP_DAYS + 1) last.end = date;
    else periods.push({ start: date, end: date, source: 'logged' });
  }
  if (seed && !periods.some((p) => Math.abs(daysBetween(seed.start, p.start)) <= SEED_MATCH_DAYS)) {
    periods.push({ start: seed.start, end: addDays(seed.start, seed.length - 1), source: 'seed' });
    periods.sort((a, b) => (a.start < b.start ? -1 : 1));
  }
  return periods;
}
