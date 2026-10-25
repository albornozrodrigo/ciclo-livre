import { daysBetween } from '@/domain/dates';

import type { Period } from './periods';

/** Fora desta faixa o "ciclo" provavelmente é registro esquecido ou duplicado. */
export const PLAUSIBLE_CYCLE = { min: 15, max: 90 } as const;
export const isPlausibleCycle = (length: number) => length >= PLAUSIBLE_CYCLE.min && length <= PLAUSIBLE_CYCLE.max;
/** Quantos ciclos recentes entram na média: equilibra estabilidade e mudanças recentes. */
export const RECENT_CYCLES = 6;

export type CycleStats = { mean: number; sd: number | null; count: number; lengths: number[] };

export function cycleLengths(periods: readonly Period[]): number[] {
  return periods.slice(1).map((p, i) => daysBetween(periods[i].start, p.start));
}

/** Diferença (dias) a partir da qual um ciclo fica fora do padrão, e mínimo de ciclos para comparar. */
export const ATYPICAL = { days: 8, minReferences: 3, diffReferences: 2 } as const;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Os outros ciclos plausíveis (referência para comparar o ciclo `i`). */
const othersOf = (lengths: readonly number[], i: number) => lengths.filter((l, j) => j !== i && isPlausibleCycle(l));

/** Os ciclos recentes julgados juntos: previsão, Análise, PDF e chat usam a mesma janela. */
export const ATYPICAL_WINDOW = 12;

/**
 * Fora do padrão, dentro de uma janela: implausível, ou a 8+ dias da mediana dos outros ciclos (só com 3+
 * referências). A mediana não é puxada pelo próprio ciclo atípico. Só vale se os marcados forem minoria
 * (até 1/3 dos plausíveis): dois grupos parecidos ou ciclos alternados são o padrão da pessoa, não exceção.
 */
export function atypicalFlags(lengths: readonly number[]): boolean[] {
  const raw = lengths.map((length, i) => {
    if (!isPlausibleCycle(length)) return true;
    const others = othersOf(lengths, i);
    return others.length >= ATYPICAL.minReferences && Math.abs(length - median(others)) >= ATYPICAL.days;
  });
  const plausible = lengths.filter(isPlausibleCycle).length;
  const flagged = lengths.filter((l, i) => isPlausibleCycle(l) && raw[i]).length;
  return flagged * 3 > plausible ? lengths.map((l) => !isPlausibleCycle(l)) : raw;
}

/** Quantos dias o ciclo ficou acima (+) ou abaixo (−) do habitual; null sem referência suficiente ou implausível. */
export function diffsFromUsual(lengths: readonly number[]): (number | null)[] {
  return lengths.map((length, i) => {
    const others = othersOf(lengths, i);
    if (!isPlausibleCycle(length) || others.length < ATYPICAL.diffReferences) return null;
    // Truncado em direção a zero (simétrico): meio dia não vira "1 dia mais longo".
    return Math.trunc(length - median(others)) || 0;
  });
}

/** Marcas para a lista inteira (do mais antigo ao mais recente): julga os últimos 12; os anteriores, só se implausíveis. */
export function recentAtypical(lengths: readonly number[]): boolean[] {
  const cut = Math.max(0, lengths.length - ATYPICAL_WINDOW);
  return [...lengths.slice(0, cut).map((l) => !isPlausibleCycle(l)), ...atypicalFlags(lengths.slice(cut))];
}

/** Diferenças para a lista inteira: só os últimos 12 (mesma janela das marcas). */
export function recentDiffs(lengths: readonly number[]): (number | null)[] {
  const cut = Math.max(0, lengths.length - ATYPICAL_WINDOW);
  return [...lengths.slice(0, cut).map(() => null), ...diffsFromUsual(lengths.slice(cut))];
}

/**
 * Média e desvio-padrão (populacional) dos ciclos válidos mais recentes; sem dados, a duração do perfil.
 * Ciclos fora do padrão (julgados nos últimos 12) ficam de fora, a menos que `includeAtypical`.
 */
export function cycleStats(lengths: readonly number[], fallbackLength: number, options: { includeAtypical?: boolean } = {}): CycleStats {
  const flags = recentAtypical(lengths);
  const valid = lengths.filter((l, i) => isPlausibleCycle(l) && (options.includeAtypical || !flags[i])).slice(-RECENT_CYCLES);
  if (valid.length === 0) return { mean: fallbackLength, sd: null, count: 0, lengths: [] };
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (valid.length === 1) return { mean, sd: null, count: 1, lengths: valid };
  const variance = valid.reduce((acc, l) => acc + (l - mean) ** 2, 0) / valid.length;
  return { mean, sd: Math.sqrt(variance), count: valid.length, lengths: valid };
}
