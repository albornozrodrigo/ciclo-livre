import { addDays, daysBetween, type IsoDate } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

import { cycleModelFor } from './for-profile';
import { type Confidence, dayInfo, fertileWindow, type Phase, pregnancyWeek } from './model';
import { predictPainDays } from './pain';
import type { CycleSignals } from './signals';

export type TodayView =
  | { kind: 'none' }
  | { kind: 'no_bleeding' }
  | { kind: 'pregnancy'; week: number; day: number; daysToDue: number }
  | {
      kind: 'cycle';
      phase: Phase;
      cycleDay: number;
      daysToNext: number;
      late: boolean;
      lateDays?: number;
      next: { start: IsoDate; earliest: IsoDate; latest: IsoDate };
      /** Janela fértil atual, ou a do próximo ciclo se a atual já passou. */
      fertile: { start: IsoDate; end: IsoDate };
      confidence: Confidence;
      painDays: IsoDate[];
      /** Fase que vem depois da de hoje e em quantos dias ela começa (lobo secundário de Hoje). */
      nextPhase: { phase: Phase; inDays: number } | null;
    };

/** Procura o primeiro dia à frente com outra fase (no máximo um ciclo longo). */
function findNextPhase(model: NonNullable<ReturnType<typeof cycleModelFor>>, phase: Phase, today: IsoDate) {
  for (let d = 1; d <= 60; d++) {
    const info = dayInfo(model, addDays(today, d), today);
    if (info && info.phase !== phase) return { phase: info.phase, inDays: d };
  }
  return null;
}

/** O que a tela Hoje mostra sobre o ciclo, por modo. Função pura: `today` injetado. */
export function todayCycleView(profile: Profile, signals: CycleSignals, today: IsoDate): TodayView {
  if (profile.mode === 'pregnancy' && profile.dueDate) return { kind: 'pregnancy', ...pregnancyWeek(profile.dueDate, today) };
  if (profile.mode === 'no_bleeding') return { kind: 'no_bleeding' };

  const model = cycleModelFor(profile, signals, today);
  const info = model && dayInfo(model, today, today);
  if (!model || !info) return { kind: 'none' };

  const currentWindow = fertileWindow(model.current.ovulation.date);
  const nextInfo = dayInfo(model, model.next.start, today);
  const fertile = today <= currentWindow.end || !nextInfo ? currentWindow : fertileWindow(nextInfo.ovulation.date);

  return {
    kind: 'cycle',
    phase: info.phase,
    cycleDay: info.cycleDay,
    daysToNext: daysBetween(today, model.next.start),
    late: model.late,
    ...(model.late ? { lateDays: daysBetween(model.expected, today) } : {}),
    next: model.next,
    fertile,
    confidence: model.confidence,
    painDays: predictPainDays(model.periods, signals.painDates, model.next.start),
    nextPhase: model.late ? null : findNextPhase(model, info.phase, today),
  };
}
