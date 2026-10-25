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
  /** Fase lútea informada no perfil; vale quando não há medida pela temperatura. */
  profileLutealLength?: number | null;
  /** Incluir ciclos fora do padrão na média (padrão: não). */
  includeAtypical?: boolean;
};

export type Confidence = 'low' | 'medium' | 'high';
export type Ovulation = { date: IsoDate; method: OvulationMethod };
export type CycleSpan = { start: IsoDate; nextStart: IsoDate; periodEnd: IsoDate; ovulation: Ovulation };
/** `hormonal`: dia sem sangramento com contracepção hormonal (sem estimativa de fertilidade). */
export type Phase = 'menstruation' | 'follicular' | 'fertile' | 'luteal' | 'hormonal';

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
  /** Data em que a menstruação era esperada (para contar o atraso). */
  expected: IsoDate;
  /** Ciclos completos (passados) e o atual. */
  spans: CycleSpan[];
  current: CycleSpan;
  /** Contracepção hormonal: sem janela fértil nem ovulação em nenhuma tela. Ligado por `cycleModelFor`. */
  fertilityHidden: boolean;
  /** Ciclos fora do padrão entram na média (preferência do perfil). */
  includeAtypical: boolean;
};

const DEFAULT_LUTEAL = 14;
/** Janela fértil: 5 dias antes da ovulação até 1 depois (ver plano 04-01). */
export const FERTILE_BEFORE = 5;
export const FERTILE_AFTER = 1;

export const fertileWindow = (ovulation: IsoDate) => ({
  start: addDays(ovulation, -FERTILE_BEFORE),
  end: addDays(ovulation, FERTILE_AFTER),
});
const MARGIN = { fallback: 2, min: 1, max: 7 } as const;
const GESTATION_DAYS = 280;

/** Menstruação ainda em andamento: o último registro de fluxo foi hoje ou ontem. */
const isOngoing = (period: Period, today: IsoDate) => period.source === 'logged' && daysBetween(period.end, today) <= 1;

function averagePeriodLength(periods: readonly Period[], fallback: number, today: IsoDate): number {
  // A que está em andamento ainda não terminou: entraria encurtada na média.
  const logged = periods.filter((p) => p.source === 'logged' && !isOngoing(p, today)).map((p) => daysBetween(p.start, p.end) + 1);
  return logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : fallback;
}

function confidenceOf(stats: CycleStats): Confidence {
  if (stats.count < 2 || (stats.sd !== null && stats.sd > 4)) return 'low';
  if (stats.count >= 3 && stats.sd !== null && stats.sd <= 2) return 'high';
  return 'medium';
}

/**
 * Ovulação de um ciclo: sinais registrados entre `start` e `end`; sem sinais, calendário a partir
 * de `calendarNext` (o início seguinte real, ou o esperado — nunca "hoje", para não andar no atraso).
 */
function ovulationFor(inputs: CycleInputs, start: IsoDate, end: IsoDate, calendarNext: IsoDate, luteal: number): Ovulation {
  return chooseOvulation({
    bbt: bbtOvulation(inputs.temperatures, start, end),
    test: testOvulation(inputs.positiveOvulationTests, start, end),
    mucus: mucusPeakOvulation(inputs.eggWhiteDates, start, end),
    calendar: addDays(calendarNext, -luteal),
  });
}

/**
 * Fase lútea: medida pela temperatura nos ciclos passados; senão a informada no perfil, se couber no ciclo
 * (a janela fértil não pode começar dentro da menstruação); senão 14 dias.
 */
function measuredLuteal(inputs: CycleInputs, periods: readonly Period[], cycleLength: number, periodLength: number): number {
  const confirmed = periods.slice(0, -1).flatMap((p, i) => {
    const nextStart = periods[i + 1].start;
    const ovulation = bbtOvulation(inputs.temperatures, p.start, addDays(nextStart, -1));
    return ovulation ? [{ ovulation, nextStart }] : [];
  });
  const informed = inputs.profileLutealLength ?? null;
  const fits = informed !== null && informed <= cycleLength - periodLength - FERTILE_BEFORE;
  return lutealLength(confirmed) ?? (fits ? informed : DEFAULT_LUTEAL);
}

/** Modelo do ciclo a partir dos registros. Sem nenhuma menstruação conhecida, devolve null. */
export function buildCycleModel(inputs: CycleInputs, today: IsoDate): CycleModel | null {
  const periods = detectPeriods(inputs.flowDates, inputs.seed);
  if (periods.length === 0) return null;
  const includeAtypical = inputs.includeAtypical ?? false;
  const stats = cycleStats(cycleLengths(periods), inputs.profileCycleLength, { includeAtypical });
  const cycleLength = Math.round(stats.mean);
  const periodLength = averagePeriodLength(periods, inputs.profilePeriodLength, today);
  const luteal = measuredLuteal(inputs, periods, cycleLength, periodLength);

  const spans: CycleSpan[] = periods.slice(0, -1).map((p, i) => {
    const nextStart = periods[i + 1].start;
    return {
      start: p.start,
      nextStart,
      periodEnd: p.end,
      ovulation: ovulationFor(inputs, p.start, addDays(nextStart, -1), nextStart, luteal),
    };
  });

  const last = periods[periods.length - 1];
  const expected = addDays(last.start, cycleLength);
  const late = expected < today;
  // O que se mostra como "próxima": a data esperada, ou hoje se já passou.
  const shownNext = late ? today : expected;
  // Fronteira do ciclo atual: nunca antes de amanhã, para hoje não virar "dia 1" sem registro.
  const boundary = shownNext > today ? shownNext : addDays(today, 1);
  const margin = Math.min(MARGIN.max, Math.max(MARGIN.min, Math.ceil(stats.sd ?? MARGIN.fallback)));
  // Em andamento, a menstruação atual vai pelo menos até a duração média.
  const ongoingEnd = addDays(last.start, periodLength - 1);
  const periodEnd = isOngoing(last, today) && ongoingEnd > last.end ? ongoingEnd : last.end;
  const current: CycleSpan = {
    start: last.start,
    nextStart: boundary,
    periodEnd,
    ovulation: ovulationFor(inputs, last.start, addDays(boundary, -1), expected, luteal),
  };

  return {
    periods,
    stats,
    cycleLength,
    periodLength,
    lutealLength: luteal,
    confidence: confidenceOf(stats),
    next: { start: shownNext, earliest: addDays(shownNext, -margin), latest: addDays(shownNext, margin) },
    late,
    expected,
    spans: [...spans, current],
    current,
    fertilityHidden: false,
    includeAtypical,
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

function phaseOf(span: CycleSpan, date: IsoDate, fertilityHidden: boolean): Phase {
  if (date <= span.periodEnd) return 'menstruation';
  if (fertilityHidden) return 'hormonal';
  const fertile = fertileWindow(span.ovulation.date);
  if (date >= fertile.start && date <= fertile.end) return 'fertile';
  return date < fertile.start ? 'follicular' : 'luteal';
}

export type DayInfo = { cycleDay: number; phase: Phase; predicted: boolean; cycleStart: IsoDate; ovulation: Ovulation };

/** Dia do ciclo e fase de qualquer data (passada, hoje ou futura, sem limite de horizonte). */
export function dayInfo(model: CycleModel, date: IsoDate, today: IsoDate): DayInfo | null {
  if (date < model.periods[0].start) return null;
  const span =
    date >= model.current.nextStart ? predictedSpan(model, date) : model.spans.find((s) => date >= s.start && date < s.nextStart);
  if (!span) return null;
  return {
    cycleDay: daysBetween(span.start, date) + 1,
    phase: phaseOf(span, date, model.fertilityHidden),
    // Previsto: dia futuro ou dentro de um ciclo previsto.
    predicted: date > today || date >= model.current.nextStart,
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
