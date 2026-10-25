import { bbtOvulation } from '@/domain/cycle/ovulation';
import { type CycleModel, dayInfo, type Ovulation, type Phase } from '@/domain/cycle/model';
import { isPlausibleCycle, recentAtypical, recentDiffs } from '@/domain/cycle/stats';
import { addDays, daysBetween, type IsoDate } from '@/domain/dates';

/** `periodLength` null: menstruação só informada no cadastro, sem dias registrados. */
/** `ovulation` null com contracepção hormonal (sem estimativa). */
/** `atypical`: fora do padrão; `diffFromUsual`: dias acima (+) ou abaixo (−) do habitual (null no atual ou sem referência). */
export type CycleRow = {
  start: IsoDate;
  length: number | null;
  periodLength: number | null;
  ovulation: Ovulation | null;
  atypical: boolean;
  diffFromUsual: number | null;
};

/**
 * Histórico de ciclos, do mais recente ao mais antigo. O atual (em curso) não tem duração.
 * A menstruação mostra só os dias registrados (a em andamento não ganha a duração estendida da previsão).
 */
export function cycleHistory(model: CycleModel): CycleRow[] {
  // Um ciclo por menstruação detectada: spans e periods andam juntos. O último é o atual (sem duração).
  const complete = model.spans.slice(0, -1).map((span) => daysBetween(span.start, span.nextStart));
  // As mesmas marcas da previsão (mesma janela dos 12 mais recentes).
  const flags = recentAtypical(complete);
  const diffs = recentDiffs(complete);
  return model.spans
    .map((span, i) => {
      const isCurrent = i === model.spans.length - 1;
      const period = model.periods[i];
      return {
        start: span.start,
        length: isCurrent ? null : complete[i],
        periodLength: period.source === 'seed' ? null : daysBetween(period.start, period.end) + 1,
        ovulation: model.fertilityHidden ? null : span.ovulation,
        atypical: isCurrent ? false : flags[i],
        diffFromUsual: isCurrent ? null : diffs[i],
      };
    })
    .reverse();
}

const SUMMARY_CYCLES = 12;

/** `periodMean` null quando nenhuma menstruação registrada terminou (só cadastro ou a atual). */
/** `excluded`: ciclos recentes fora do padrão que não entram no resumo (0 se a pessoa os inclui). */
export type CycleSummary = {
  count: number;
  mean: number;
  min: number;
  max: number;
  sd: number;
  periodMean: number | null;
  excluded: number;
};

const average = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** Menstruações registradas e terminadas, nos mesmos ciclos recentes do resumo (+ a atual). */
function recentPeriodMean(model: CycleModel): number | null {
  const last = model.periods[model.periods.length - 1];
  // A previsão estende a menstruação em andamento: ela ainda não terminou.
  const ongoing = model.current.periodEnd !== last.end;
  const lengths = model.periods
    .slice(-(SUMMARY_CYCLES + 1))
    .filter((p) => p.source === 'logged' && !(ongoing && p === last))
    .map((p) => daysBetween(p.start, p.end) + 1);
  return lengths.length ? Math.round(average(lengths)) : null;
}

/** Resumo dos ciclos completos recentes (até 12), sem durações implausíveis. Sem ciclo completo, null. */
export function cycleSummary(model: CycleModel): CycleSummary | null {
  const lengths = completeLengths(model);
  if (lengths.length === 0) return null;
  const excluded = model.includeAtypical ? 0 : recentComplete(model).filter((r) => r.atypical && isPlausibleCycle(r.length)).length;
  const mean = average(lengths);
  const sd = Math.sqrt(lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length);
  return {
    count: lengths.length,
    mean: Math.round(mean),
    min: Math.min(...lengths),
    max: Math.max(...lengths),
    sd,
    periodMean: recentPeriodMean(model),
    excluded,
  };
}

/** Ciclos completos recentes (até 12), do mais recente ao mais antigo. */
function recentComplete(model: CycleModel): (CycleRow & { length: number })[] {
  return cycleHistory(model)
    .filter((row): row is CycleRow & { length: number } => row.length !== null)
    .slice(0, SUMMARY_CYCLES);
}

/**
 * Durações dos ciclos completos recentes e plausíveis, do mais recente ao mais antigo. Sem os fora do padrão,
 * a menos que a pessoa os inclua (como na previsão).
 */
export function completeLengths(model: CycleModel): number[] {
  return recentComplete(model)
    .filter((row) => isPlausibleCycle(row.length) && (model.includeAtypical || !row.atypical))
    .map((row) => row.length);
}

/** Categorias que descrevem como a pessoa se sente (não fluxo, coleta, testes, contracepção ou medições). */
const SYMPTOM_CATEGORIES = new Set([
  'pain',
  'pms',
  'discharge',
  'energy',
  'sleep_quality',
  'digestion',
  'cravings',
  'skin',
  'hair',
  'feelings',
  'mind',
  'stress',
  'hot_flashes',
  'ailments',
  'clots',
  'mouth',
  'breasts',
  'swelling',
]);
/** Estados neutros ou bons: aparecem no registro, mas não são sintomas. */
const NOT_SYMPTOMS = new Set([
  'discharge:none',
  'discharge:sticky',
  'discharge:creamy',
  'discharge:egg_white',
  'discharge:watery',
  'energy:good',
  'energy:high',
  'sleep_quality:ok',
  'sleep_quality:restful',
  'skin:good',
  'hair:good',
  'feelings:happy',
  'feelings:calm',
  'mind:focused',
  'mind:motivated',
  'mind:creative',
  'stress:low',
]);
const MIN_COMPLETE_CYCLES = 2;

export type Selection = { date: IsoDate; category: string; option: string };
export type SymptomRow = { category: string; option: string; cycles: number; total: number; phase: Phase };

/** Em quantos ciclos completos cada sintoma apareceu e em que fase ele mais aparece. */
export function symptomFrequency(model: CycleModel, selections: readonly Selection[], today: IsoDate): SymptomRow[] {
  const complete = model.spans.slice(0, -1).slice(-SUMMARY_CYCLES);
  if (complete.length < MIN_COMPLETE_CYCLES) return [];
  const first = complete[0].start;
  const end = complete[complete.length - 1].nextStart;
  const stats = new Map<string, { category: string; option: string; cycles: Set<IsoDate>; days: number; phases: Map<Phase, number> }>();

  for (const s of selections) {
    const key = `${s.category}:${s.option}`;
    if (!SYMPTOM_CATEGORIES.has(s.category) || NOT_SYMPTOMS.has(key) || s.date < first || s.date >= end) continue;
    const info = dayInfo(model, s.date, today);
    if (!info) continue;
    const entry = stats.get(key) ?? { category: s.category, option: s.option, cycles: new Set(), days: 0, phases: new Map() };
    entry.cycles.add(info.cycleStart);
    entry.days += 1;
    entry.phases.set(info.phase, (entry.phases.get(info.phase) ?? 0) + 1);
    stats.set(key, entry);
  }

  // O total começa no primeiro ciclo com sintoma: antes disso a pessoa ainda não registrava sintomas.
  const cycleStarts = [...stats.values()].flatMap((e) => [...e.cycles]);
  if (cycleStarts.length === 0) return [];
  const firstLogged = cycleStarts.reduce((a, b) => (a < b ? a : b));
  const total = complete.filter((span) => span.start >= firstLogged).length;

  return [...stats.values()]
    .sort((a, b) => b.cycles.size - a.cycles.size || b.days - a.days)
    .map((e) => ({
      category: e.category,
      option: e.option,
      cycles: e.cycles.size,
      total,
      phase: [...e.phases.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }));
}

export type BbtChart = {
  points: { cycleDay: number; value: number }[];
  ovulationDay: number | null;
  coverLine: number | null;
  /** Contracepção hormonal: os pontos aparecem, mas sem leitura de ovulação. */
  fertilityHidden?: boolean;
};

const COVER_BASELINE_DAYS = 6;

/** Temperaturas do ciclo por dia do ciclo, ovulação (3 sobre 6) e linha de cobertura. */
/** Gráfico do ciclo atual; com contracepção hormonal não interpreta a subida. */
export function bbtChartFor(model: CycleModel, temperatures: Record<IsoDate, number>): BbtChart {
  const chart = bbtChart(temperatures, model.current.start, addDays(model.current.nextStart, -1));
  return model.fertilityHidden ? { points: chart.points, ovulationDay: null, coverLine: null, fertilityHidden: true } : chart;
}

export function bbtChart(temperatures: Record<IsoDate, number>, cycleStart: IsoDate, cycleEnd: IsoDate): BbtChart {
  const entries = Object.entries(temperatures)
    .filter(([d]) => d >= cycleStart && d <= cycleEnd)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const points = entries.map(([d, value]) => ({ cycleDay: daysBetween(cycleStart, d) + 1, value }));
  const ovulation = bbtOvulation(temperatures, cycleStart, cycleEnd);
  if (!ovulation) return { points, ovulationDay: null, coverLine: null };
  const before = entries.filter(([d]) => d <= ovulation).slice(-COVER_BASELINE_DAYS);
  return {
    points,
    ovulationDay: daysBetween(cycleStart, ovulation) + 1,
    coverLine: Math.max(...before.map(([, v]) => v)),
  };
}

export const MEASURE_WINDOW_DAYS = 90;

export type MeasureSeries = {
  points: { date: IsoDate; value: number }[];
  summary: { last: number; mean: number; min: number; max: number } | null;
};

/** Medição nos últimos 90 dias, com último valor, média e extremos. */
export function measureSeries(values: Record<IsoDate, number>, today: IsoDate): MeasureSeries {
  const from = addDays(today, -MEASURE_WINDOW_DAYS);
  const points = Object.entries(values)
    .filter(([d]) => d >= from && d <= today)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({ date, value }));
  if (points.length === 0) return { points, summary: null };
  const vals = points.map((p) => p.value);
  return {
    points,
    summary: {
      last: vals[vals.length - 1],
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
    },
  };
}

/** Ponto médio de cada faixa de sono registrada (horas). */
const SLEEP_HOURS: Record<string, number> = { under_3h: 1.5, '3_6h': 4.5, '6_9h': 7.5, over_9h: 10 };

export function sleepHours(selections: readonly Selection[]): Record<IsoDate, number> {
  const out: Record<IsoDate, number> = {};
  for (const s of selections) if (s.category === 'sleep' && SLEEP_HOURS[s.option] !== undefined) out[s.date] = SLEEP_HOURS[s.option];
  return out;
}

/** Medições mostradas na Análise e no relatório (uma lista só, para os dois não divergirem). */
export const MEASURES = ['weight', 'resting_heart_rate', 'hrv', 'sleep'] as const;
export type MeasureKey = (typeof MEASURES)[number];

/** Séries dos últimos 90 dias de cada medição; sono vem da faixa registrada. */
export function measureSeriesAll(
  measures: Record<string, Record<IsoDate, number>>,
  selections: readonly Selection[],
  today: IsoDate,
): Record<MeasureKey, MeasureSeries> {
  return {
    weight: measureSeries(measures.weight ?? {}, today),
    resting_heart_rate: measureSeries(measures.resting_heart_rate ?? {}, today),
    hrv: measureSeries(measures.hrv ?? {}, today),
    sleep: measureSeries(sleepHours(selections), today),
  };
}
