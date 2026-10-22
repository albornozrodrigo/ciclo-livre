import { addDays, daysBetween, type IsoDate } from '@/domain/dates';

import { bbtOvulation, chooseOvulation, lutealLength, mucusPeakOvulation, type OvulationMethod, testOvulation } from './ovulation';
import { detectPeriods, type Period } from './periods';
import { cycleLengths, type CycleStats, cycleStats } from './stats';

export type CycleInputs = {
  flowDates: IsoDate[];
  seed: { start: IsoDate; length: number } | null;
  temperatures: Record<IsoDate, number>;
  eggWhiteDates: IsoDate[];
  positiveOvulationTests: IsoDate[];
  profileCycleLength: number;
  profilePeriodLength: number;
};

export type Confidence = 'low' | 'medium' | 'high';
export type Ovulation = { date: IsoDate; method: OvulationMethod };
export type CycleSpan = { start: IsoDate; nextStart: IsoDate; periodEnd: IsoDate; ovulation: Ovulation };
export type Phase = 'menstruation' | 'follicular' | 'fertile' | 'luteal';

export type CycleModel = {
  periods: Period[];
  stats: CycleStats;
  cycleLength: number;
  periodLength: number;
  lutealLength: number;
  confidence: Confidence;
  /** Próxima menstruação prevista; `late` quando já passou da data esperada. */
  next: { start: IsoDate; earliest: IsoDate; latest: IsoDate };
  late: boolean;
  /** Ciclos completos (passados) e o atual. */
  spans: CycleSpan[];
  current: CycleSpan;
};

const DEFAULT_LUTEAL = 14;
const FERTILE_BEFORE = 5;
const FERTILE_AFTER = 1;
const MARGIN = { fallback: 2, min: 1, max: 7 } as const;
const GESTATION_DAYS = 280;

function averagePeriodLength(periods: readonly Period[], fallback: number): number {
  const logged = periods.filter((p) => p.source === 'logged').map((p) => daysBetween(p.start, p.end) + 1);
  return logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : fallback;
}

function confidenceOf(stats: CycleStats): Confidence {
  if (stats.count < 2 || (stats.sd !== null && stats.sd > 4)) return 'low';
  if (stats.count >= 3 && stats.sd !== null && stats.sd <= 2) return 'high';
  return 'medium';
}

function ovulationFor(inputs: CycleInputs, start: IsoDate, nextStart: IsoDate, luteal: number): Ovulation {
  const end = addDays(nextStart, -1);
  return chooseOvulation({
    bbt: bbtOvulation(inputs.temperatures, start, end),
    test: testOvulation(inputs.positiveOvulationTests, start, end),
    mucus: mucusPeakOvulation(inputs.eggWhiteDates, start, end),
    calendar: addDays(nextStart, -luteal),
  });
}

/** Fase lútea medida nos ciclos passados com ovulação confirmada por temperatura. */
function measuredLuteal(inputs: CycleInputs, periods: readonly Period[]): number {
  const confirmed = periods.slice(0, -1).flatMap((p, i) => {
    const nextStart = periods[i + 1].start;
    const ovulation = bbtOvulation(inputs.temperatures, p.start, addDays(nextStart, -1));
    return ovulation ? [{ ovulation, nextStart }] : [];
  });
  return lutealLength(confirmed) ?? DEFAULT_LUTEAL;
}

/** Modelo do ciclo a partir dos registros. Sem nenhuma menstruação conhecida, devolve null. */
export function buildCycleModel(inputs: CycleInputs, today: IsoDate): CycleModel | null {
  const periods = detectPeriods(inputs.flowDates, inputs.seed);
  if (periods.length === 0) return null;
  const stats = cycleStats(cycleLengths(periods), inputs.profileCycleLength);
  const cycleLength = Math.round(stats.mean);
  const luteal = measuredLuteal(inputs, periods);

  const spans: CycleSpan[] = periods.slice(0, -1).map((p, i) => ({
    start: p.start,
    nextStart: periods[i + 1].start,
    periodEnd: p.end,
    ovulation: ovulationFor(inputs, p.start, periods[i + 1].start, luteal),
  }));

  const last = periods[periods.length - 1];
  const expected = addDays(last.start, cycleLength);
  const late = expected < today;
  const nextStart = late ? today : expected;
  const margin = Math.min(MARGIN.max, Math.max(MARGIN.min, Math.ceil(stats.sd ?? MARGIN.fallback)));
  const current: CycleSpan = { start: last.start, nextStart, periodEnd: last.end, ovulation: ovulationFor(inputs, last.start, nextStart, luteal) };

  return {
    periods,
    stats,
    cycleLength,
    periodLength: averagePeriodLength(periods, inputs.profilePeriodLength),
    lutealLength: luteal,
    confidence: confidenceOf(stats),
    next: { start: nextStart, earliest: addDays(nextStart, -margin), latest: addDays(nextStart, margin) },
    late,
    spans: [...spans, current],
    current,
  };
}

/** Ciclo previsto que contém `date` (depois do atual), repetindo a duração média. */
function predictedSpan(model: CycleModel, date: IsoDate): CycleSpan {
  const k = Math.floor(daysBetween(model.current.nextStart, date) / model.cycleLength);
  const start = addDays(model.current.nextStart, k * model.cycleLength);
  const nextStart = addDays(start, model.cycleLength);
  return {
    start,
    nextStart,
    periodEnd: addDays(start, model.periodLength - 1),
    ovulation: { date: addDays(nextStart, -model.lutealLength), method: 'calendar' },
  };
}

function phaseOf(span: CycleSpan, date: IsoDate): Phase {
  if (date <= span.periodEnd) return 'menstruation';
  const fertileStart = addDays(span.ovulation.date, -FERTILE_BEFORE);
  const fertileEnd = addDays(span.ovulation.date, FERTILE_AFTER);
  if (date >= fertileStart && date <= fertileEnd) return 'fertile';
  return date < fertileStart ? 'follicular' : 'luteal';
}

export type DayInfo = { cycleDay: number; phase: Phase; predicted: boolean; cycleStart: IsoDate; ovulation: Ovulation };

/** Dia do ciclo e fase de qualquer data (passada, hoje ou futura, sem limite de horizonte). */
export function dayInfo(model: CycleModel, date: IsoDate, today: IsoDate): DayInfo | null {
  if (date < model.periods[0].start) return null;
  const span = date >= model.current.nextStart ? predictedSpan(model, date) : model.spans.find((s) => date >= s.start && date < s.nextStart);
  if (!span) return null;
  return {
    cycleDay: daysBetween(span.start, date) + 1,
    phase: phaseOf(span, date),
    predicted: date > today,
    cycleStart: span.start,
    ovulation: span.ovulation,
  };
}

/** Semanas de gestação contadas a partir de 280 dias antes da data prevista do parto. */
export function pregnancyWeek(dueDate: IsoDate, today: IsoDate): { week: number; day: number; daysToDue: number } {
  const daysToDue = daysBetween(today, dueDate);
  const gestation = Math.max(0, GESTATION_DAYS - daysToDue);
  return { week: Math.floor(gestation / 7), day: gestation % 7, daysToDue };
}
