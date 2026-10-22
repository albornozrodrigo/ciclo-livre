import {
  bbtChart,
  type BbtChart,
  cycleHistory,
  type CycleRow,
  type CycleSummary,
  cycleSummary,
  MEASURE_WINDOW_DAYS,
  type MeasureKey,
  measureSeriesAll,
  type MeasureSeries,
  type Selection,
  symptomFrequency,
  type SymptomRow,
} from '@/domain/analysis/analysis';
import type { CycleModel } from '@/domain/cycle/model';
import { addDays, type IsoDate } from '@/domain/dates';
import type { Note } from '@/domain/export/format';
import type { Profile } from '@/domain/profile';

/** Ciclos completos que entram no relatório (o "PDF de 6 ciclos" para levar à consulta). */
export const REPORT_CYCLES = 6;
const MAX_SYMPTOMS = 10;

export type Report = {
  generatedOn: IsoDate;
  period: { from: IsoDate; to: IsoDate };
  mode: Profile['mode'];
  birthControl: Profile['birthControl'];
  /** null quando não há ciclo para mostrar (gravidez, sem sangramento ou sem registros). */
  cycles: { summary: CycleSummary | null; complete: CycleRow[]; current: CycleRow; symptoms: SymptomRow[]; bbt: BbtChart } | null;
  measures: Record<MeasureKey, MeasureSeries>;
  notes: Note[];
};

type Input = {
  model: CycleModel | null;
  profile: Profile;
  selections: readonly Selection[];
  measures: Record<string, Record<IsoDate, number>>;
  notes: readonly Note[];
  today: IsoDate;
  /** Notas só entram se a pessoa marcar (podem ser íntimas). */
  includeNotes: boolean;
};

/** Conteúdo do relatório, todo derivado do domínio da Análise (nenhum cálculo novo). */
export function buildReport({ model, profile, selections, measures, notes, today, includeNotes }: Input): Report {
  let cycles: Report['cycles'] = null;
  if (model) {
    const history = cycleHistory(model);
    const complete = history.filter((r) => r.length !== null).slice(0, REPORT_CYCLES);
    cycles = {
      summary: cycleSummary(model),
      complete,
      current: history[0],
      symptoms: symptomFrequency(model, selections, today).slice(0, MAX_SYMPTOMS),
      bbt: bbtChart(measures.temperature ?? {}, model.current.start, addDays(model.current.nextStart, -1)),
    };
  }
  const from = cycles ? (cycles.complete.at(-1)?.start ?? cycles.current.start) : addDays(today, -MEASURE_WINDOW_DAYS);
  return {
    generatedOn: today,
    period: { from, to: today },
    mode: profile.mode,
    birthControl: profile.birthControl,
    cycles,
    measures: measureSeriesAll(measures, selections, today),
    notes: includeNotes ? notes.filter((n) => n.date >= from && n.date <= today).map((n) => ({ date: n.date, text: n.text })) : [],
  };
}
