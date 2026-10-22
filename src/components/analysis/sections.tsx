import { Text, View } from 'react-native';

import { MEASURES, type AnalysisView } from '@/analysis/use-analysis';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { shortDate } from '@/components/cycle/cycle-card';
import type { BbtChart, CycleRow, CycleSummary, MeasureSeries, SymptomRow } from '@/domain/analysis/analysis';
import { daysBetween, todayIso } from '@/domain/dates';
import { ptBR } from '@/i18n/pt-BR';
import { categoryLabels } from '@/i18n/pt-BR-tracking';

const a = ptBR.analysis;
const fmt = (n: number, decimals = 1) => n.toFixed(decimals).replace('.', ',');

const PHASE_CHIP = {
  menstruation: 'bg-coral dark:bg-coral-night',
  follicular: 'bg-pond dark:bg-pond-night',
  fertile: 'bg-land dark:bg-land-night',
  luteal: 'bg-lilac dark:bg-lilac-night',
} as const;

export const SectionTitle = ({ children }: { children: string }) => (
  <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
    {children}
  </Text>
);
const Muted = ({ children }: { children: string }) => <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{children}</Text>;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    // Rótulo e valor juntos para o TalkBack ("Ciclo médio: 28 dias").
    <View accessible accessibilityLabel={`${label}: ${value}`} className="min-w-[30%] flex-1 gap-1">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink-muted dark:text-ink-muted-night">{label}</Text>
      {/* Número em destaque: algarismos proporcionais (não tabulares) em tamanho grande. */}
      <Text className="text-2xl font-bold text-ink dark:text-ink-night">{value}</Text>
    </View>
  );
}

export function CycleNumbers({ summary }: { summary: CycleSummary }) {
  return (
    <View className="flex-row flex-wrap gap-4">
      <Stat label={a.stats.cycle} value={a.stats.cycleValue(summary.mean)} />
      <Stat label={a.stats.range} value={a.stats.rangeValue(summary.min, summary.max)} />
      <Stat label={a.stats.period} value={a.stats.periodValue(summary.periodMean)} />
    </View>
  );
}

export function CycleBars({ history, summary }: { history: CycleRow[]; summary: CycleSummary }) {
  const complete = history.filter((r) => r.length !== null).slice(0, 12).reverse();
  const bars = complete.map((r, i) => ({
    key: r.start,
    value: r.length as number,
    label: a.barValue(shortDate(r.start), r.length as number),
    emphasized: i === complete.length - 1,
  }));
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{a.chartTitle}</Text>
      <BarChart
        bars={bars}
        reference={summary.mean}
        referenceLabel={`${a.mean(summary.mean)} · ${a.tapHint}`}
        summary={a.chartSummary(summary.count, summary.mean, summary.min, summary.max)}
      />
    </View>
  );
}

/** Tabela do histórico (também a versão acessível do gráfico de barras). */
export function CycleHistory({ history }: { history: CycleRow[] }) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{a.history.title}</Text>
      {history.map((r) => (
        <View key={r.start} className="min-h-14 flex-row items-center justify-between gap-3 border-b border-line py-2 dark:border-line-night">
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-ink dark:text-ink-night">{a.history.started(shortDate(r.start))}</Text>
            <Muted>{a.history.period(r.periodLength)}</Muted>
          </View>
          <Text className="text-base font-bold text-ink [font-variant:tabular-nums] dark:text-ink-night">
            {r.length === null ? a.history.ongoing : a.history.length(r.length)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Symptoms({ rows }: { rows: SymptomRow[] }) {
  if (rows.length === 0) return <Muted>{a.symptoms.empty}</Muted>;
  return (
    <View className="gap-1">
      {rows.slice(0, 8).map((r) => {
        const label = categoryLabels(r.category).options?.[r.option] ?? r.option;
        return (
          <View key={`${r.category}:${r.option}`} className="min-h-14 gap-2 border-b border-line py-3 dark:border-line-night">
            <Text className="text-base font-bold text-ink dark:text-ink-night">{a.symptoms.row(label, r.cycles, r.total)}</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-ink-muted dark:text-ink-muted-night">{a.symptoms.mostIn}</Text>
              <View className={`rounded-full px-3 py-1 ${PHASE_CHIP[r.phase]}`}>
                <Text className="text-sm font-bold text-ink">{ptBR.cycle.phases[r.phase]}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function Temperature({ chart }: { chart: BbtChart }) {
  if (chart.points.length < 3) return <Muted>{a.bbt.empty}</Muted>;
  const values = chart.points.map((p) => p.value);
  const last = chart.points[chart.points.length - 1].cycleDay;
  return (
    <View className="gap-3">
      <LineChart
        points={chart.points.map((p) => ({ x: p.cycleDay, y: p.value }))}
        xDomain={[1, Math.max(last, 2)]}
        referenceY={chart.coverLine}
        markerX={chart.ovulationDay}
        summary={a.bbt.chartSummary(values.length, fmt(Math.min(...values), 2), fmt(Math.max(...values), 2))}
      />
      <Text className="text-base text-ink dark:text-ink-night">
        {chart.ovulationDay ? a.bbt.confirmed(chart.ovulationDay) : a.bbt.notYet}
      </Text>
    </View>
  );
}

const UNITS: Record<(typeof MEASURES)[number], { unit: string; decimals: number }> = {
  weight: { unit: 'kg', decimals: 1 },
  resting_heart_rate: { unit: 'bpm', decimals: 0 },
  hrv: { unit: 'ms', decimals: 0 },
  sleep: { unit: 'h', decimals: 1 },
};

function MeasureCard({ name, series, unit, decimals }: { name: string; series: MeasureSeries; unit: string; decimals: number }) {
  const today = todayIso();
  return (
    <View className="gap-2 border-b border-line pb-5 dark:border-line-night">
      <Text className="text-base font-bold text-ink dark:text-ink-night">{name}</Text>
      {series.summary ? (
        <>
          <View className="flex-row gap-5">
            <Text className="text-base text-ink dark:text-ink-night">{a.measures.last(fmt(series.summary.last, decimals), unit)}</Text>
            <Text className="text-base text-ink-muted dark:text-ink-muted-night">{a.measures.mean(fmt(series.summary.mean, decimals), unit)}</Text>
          </View>
          {series.points.length > 1 ? (
            <LineChart
              height={64}
              showDots={series.points.length <= 20}
              points={series.points.map((p) => ({ x: daysBetween(today, p.date), y: p.value }))}
              xDomain={[-90, 0]}
              summary={a.measures.chartSummary(name, series.points.length, fmt(series.summary.min, decimals), fmt(series.summary.max, decimals), unit)}
            />
          ) : null}
        </>
      ) : (
        <Muted>{a.measures.empty}</Muted>
      )}
    </View>
  );
}

export function Measures({ measures }: { measures: AnalysisView['measures'] }) {
  return (
    <View className="gap-5">
      {MEASURES.map((key) => (
        <MeasureCard key={key} name={a.measures.names[key]} series={measures[key]} {...UNITS[key]} />
      ))}
    </View>
  );
}
