import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getAnalysisData } from '@/db/cycle-repo';
import {
  bbtChart,
  type BbtChart,
  cycleHistory,
  type CycleRow,
  type CycleSummary,
  cycleSummary,
  type MeasureKey,
  measureSeriesAll,
  type MeasureSeries,
  symptomFrequency,
  type SymptomRow,
} from '@/domain/analysis/analysis';
import { cycleModelFor, modeHasCycle } from '@/domain/cycle/for-profile';
import { addDays, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { log } from '@/lib/logger';
import { signalsFromAnalysis } from '@/domain/cycle/signals';

export { MEASURES, type MeasureKey } from '@/domain/analysis/analysis';

export type AnalysisView = {
  /** null quando o modo não acompanha ciclo (gravidez, sem sangramento). */
  cycles: {
    summary: CycleSummary | null;
    history: CycleRow[];
    symptoms: SymptomRow[];
    bbt: BbtChart;
  } | null;
  measures: Record<MeasureKey, MeasureSeries>;
};

/** Tudo da aba Análise, calculado no aparelho; recalcula ao ganhar foco. */
export function useAnalysis(profile: Profile | null): AnalysisView | null {
  const db = useSQLiteContext();
  const [view, setView] = useState<AnalysisView | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return undefined;
      let active = true;
      // Uma leitura só: os sinais da previsão saem dos mesmos dados da Análise.
      getAnalysisData(db)
        .then((data) => {
          if (!active) return;
          const signals = signalsFromAnalysis(data);
          const today = todayIso();
          const model = cycleModelFor(profile, signals, today);
          const measures = measureSeriesAll(data.measures, data.selections, today);
          // null só quando o modo não tem ciclo; modo com ciclo e sem dados mostra o convite a registrar.
          const cycles = !modeHasCycle(profile)
            ? null
            : model
              ? {
                  summary: cycleSummary(model),
                  history: cycleHistory(model),
                  symptoms: symptomFrequency(model, data.selections, today),
                  bbt: bbtChart(data.measures.temperature ?? {}, model.current.start, addDays(model.current.nextStart, -1)),
                }
              : {
                  summary: null,
                  history: [],
                  symptoms: [],
                  bbt: { points: [], ovulationDay: null, coverLine: null },
                };
          setView({ cycles, measures });
        })
        // Também pega erro do cálculo (não só da leitura), para não virar rejeição sem log.
        .catch((error: unknown) => log.error('analysis_load_failed', error));
      return () => {
        active = false;
      };
    }, [db, profile]),
  );

  return view;
}
