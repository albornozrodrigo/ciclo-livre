import { daysBetween } from '@/domain/dates';

import type { Period } from './periods';

/** Fora desta faixa o "ciclo" provavelmente é registro esquecido ou duplicado. */
export const PLAUSIBLE_CYCLE = { min: 15, max: 90 } as const;
/** Quantos ciclos recentes entram na média: equilibra estabilidade e mudanças recentes. */
export const RECENT_CYCLES = 6;

export type CycleStats = { mean: number; sd: number | null; count: number; lengths: number[] };

export function cycleLengths(periods: readonly Period[]): number[] {
  return periods.slice(1).map((p, i) => daysBetween(periods[i].start, p.start));
}

/** Média e desvio-padrão (populacional) dos ciclos válidos mais recentes; sem dados, a duração do perfil. */
export function cycleStats(lengths: readonly number[], fallbackLength: number): CycleStats {
  const valid = lengths.filter((l) => l >= PLAUSIBLE_CYCLE.min && l <= PLAUSIBLE_CYCLE.max).slice(-RECENT_CYCLES);
  if (valid.length === 0) return { mean: fallbackLength, sd: null, count: 0, lengths: [] };
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (valid.length === 1) return { mean, sd: null, count: 1, lengths: valid };
  const variance = valid.reduce((acc, l) => acc + (l - mean) ** 2, 0) / valid.length;
  return { mean, sd: Math.sqrt(variance), count: valid.length, lengths: valid };
}
