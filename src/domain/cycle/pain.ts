import { addDays, daysBetween, type IsoDate } from '@/domain/dates';

import type { Period } from './periods';
import { RECENT_CYCLES } from './stats';

const MIN_CYCLES = 2;

/**
 * Dias do próximo ciclo em que a dor provavelmente volta: dias do ciclo com dor em mais da metade
 * dos ciclos completos recentes (uma ocorrência isolada não basta).
 */
export function predictPainDays(periods: readonly Period[], painDates: readonly IsoDate[], nextStart: IsoDate): IsoDate[] {
  const cycles = periods.slice(0, -1).map((p, i) => ({ start: p.start, nextStart: periods[i + 1].start })).slice(-RECENT_CYCLES);
  if (cycles.length < MIN_CYCLES) return [];
  const counts = new Map<number, number>();
  for (const cycle of cycles) {
    const days = new Set(
      painDates.filter((d) => d >= cycle.start && d < cycle.nextStart).map((d) => daysBetween(cycle.start, d) + 1),
    );
    for (const day of days) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > cycles.length / 2)
    .map(([day]) => addDays(nextStart, day - 1))
    .sort();
}
