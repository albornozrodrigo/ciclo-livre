import type { IsoDate } from '@/domain/dates';
import { isSymptom } from '@/domain/tracking/symptoms';

/** Sinais registrados que alimentam o motor de previsão. */
export type CycleSignals = {
  flowDates: IsoDate[];
  temperatures: Record<IsoDate, number>;
  eggWhiteDates: IsoDate[];
  positiveOvulationTests: IsoDate[];
  painDates: IsoDate[];
  /** Registros que contam como sintoma ("Pode aparecer hoje"). */
  symptoms?: { date: IsoDate; category: string; option: string }[];
};

type LogRows = {
  selections: readonly { date: IsoDate; category: string; option: string }[];
  measures: Record<string, Record<IsoDate, number>>;
};

const uniqueSorted = (dates: IsoDate[]) => [...new Set(dates)].sort();

/** Os mesmos sinais de `getCycleSignals`, tirados de uma leitura já feita (Análise, PDF, chat): uma ida ao banco só. */
export function signalsFromAnalysis(data: LogRows): CycleSignals {
  const where = (category: string, option?: string) =>
    uniqueSorted(
      data.selections.filter((s) => s.category === category && (option === undefined || s.option === option)).map((s) => s.date),
    );
  return {
    flowDates: where('period'),
    temperatures: { ...(data.measures.temperature ?? {}) },
    eggWhiteDates: where('discharge', 'egg_white'),
    positiveOvulationTests: where('tests', 'ovulation_positive'),
    painDates: where('pain'),
    symptoms: data.selections.filter((s) => isSymptom(s.category, s.option)).map((s) => ({ ...s })),
  };
}
