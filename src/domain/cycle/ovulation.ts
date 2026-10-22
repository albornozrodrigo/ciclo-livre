import { addDays, daysBetween, type IsoDate } from '@/domain/dates';

/** Diferença mínima (°C) da 3ª temperatura alta sobre a maior das 6 anteriores. */
const BBT_THIRD_RISE = 0.2;
const BBT_BASELINE_DAYS = 6;
const BBT_HIGHS = 3;

const inRange = (date: IsoDate, from: IsoDate, to: IsoDate) => date >= from && date <= to;

/**
 * Regra "3 sobre 6": 3 medições seguidas acima da maior das 6 anteriores (a 3ª ao menos 0,2 °C
 * acima). Dias sem medição são pulados. Ovulação = dia anterior à 1ª alta.
 */
export function bbtOvulation(temperatures: Record<IsoDate, number>, from: IsoDate, to: IsoDate): IsoDate | null {
  const series = Object.entries(temperatures)
    .filter(([d]) => inRange(d, from, to))
    .sort(([a], [b]) => (a < b ? -1 : 1));
  for (let i = BBT_BASELINE_DAYS; i + BBT_HIGHS <= series.length; i++) {
    const baseline = Math.max(...series.slice(i - BBT_BASELINE_DAYS, i).map(([, v]) => v));
    const highs = series.slice(i, i + BBT_HIGHS);
    const allAbove = highs.every(([, v]) => v > baseline);
    const thirdRise = highs[BBT_HIGHS - 1][1] - baseline >= BBT_THIRD_RISE - 1e-9;
    if (allAbove && thirdRise) return addDays(series[i][0], -1);
  }
  return null;
}

/** Último dia de muco "clara de ovo" no ciclo (pico ≈ ovulação). */
export function mucusPeakOvulation(eggWhiteDates: readonly IsoDate[], from: IsoDate, to: IsoDate): IsoDate | null {
  const inCycle = eggWhiteDates.filter((d) => inRange(d, from, to)).sort();
  return inCycle.at(-1) ?? null;
}

/** Primeiro teste de ovulação positivo do ciclo; o pico de LH antecede a ovulação em ~1 dia. */
export function testOvulation(positiveDates: readonly IsoDate[], from: IsoDate, to: IsoDate): IsoDate | null {
  const first = positiveDates.filter((d) => inRange(d, from, to)).sort()[0];
  return first ? addDays(first, 1) : null;
}

export type OvulationMethod = 'bbt' | 'test' | 'mucus' | 'calendar';

export function chooseOvulation(candidates: { bbt: IsoDate | null; test: IsoDate | null; mucus: IsoDate | null; calendar: IsoDate }) {
  if (candidates.bbt) return { date: candidates.bbt, method: 'bbt' as const };
  if (candidates.test) return { date: candidates.test, method: 'test' as const };
  if (candidates.mucus) return { date: candidates.mucus, method: 'mucus' as const };
  return { date: candidates.calendar, method: 'calendar' as const };
}

/** Fase lútea medida (ovulações confirmadas por temperatura → próxima menstruação), se houver. */
export function lutealLength(confirmed: readonly { ovulation: IsoDate; nextStart: IsoDate }[]): number | null {
  const lengths = confirmed.map((c) => daysBetween(c.ovulation, c.nextStart)).filter((l) => l >= 7 && l <= 20);
  if (lengths.length === 0) return null;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}
