import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getAnalysisData, getCycleSignals } from "@/db/cycle-repo";
import {
  bbtChart,
  type BbtChart,
  cycleHistory,
  type CycleRow,
  type CycleSummary,
  cycleSummary,
  measureSeries,
  type MeasureSeries,
  sleepHours,
  symptomFrequency,
  type SymptomRow,
} from "@/domain/analysis/analysis";
import { cycleModelFor, modeHasCycle } from "@/domain/cycle/for-profile";
import { addDays, todayIso } from "@/domain/dates";
import type { Profile } from "@/domain/profile";
import { log } from "@/lib/logger";

export const MEASURES = [
  "weight",
  "resting_heart_rate",
  "hrv",
  "sleep",
] as const;
export type MeasureKey = (typeof MEASURES)[number];

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
      Promise.all([getCycleSignals(db), getAnalysisData(db)])
        .then(([signals, data]) => {
          if (!active) return;
          const today = todayIso();
          const model = cycleModelFor(profile, signals, today);
          const measures = {
            weight: measureSeries(data.measures.weight ?? {}, today),
            resting_heart_rate: measureSeries(
              data.measures.resting_heart_rate ?? {},
              today,
            ),
            hrv: measureSeries(data.measures.hrv ?? {}, today),
            sleep: measureSeries(sleepHours(data.selections), today),
          };
          // null só quando o modo não tem ciclo; modo com ciclo e sem dados mostra o convite a registrar.
          const cycles = !modeHasCycle(profile)
            ? null
            : model
              ? {
                  summary: cycleSummary(model),
                  history: cycleHistory(model),
                  symptoms: symptomFrequency(model, data.selections, today),
                  bbt: bbtChart(
                    data.measures.temperature ?? {},
                    model.current.start,
                    addDays(model.current.nextStart, -1),
                  ),
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
        .catch((error: unknown) => log.error("analysis_load_failed", error));
      return () => {
        active = false;
      };
    }, [db, profile]),
  );

  return view;
}
