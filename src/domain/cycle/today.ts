import { addDays, daysBetween, type IsoDate } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

import { buildCycleModel, type Confidence, dayInfo, type Phase, pregnancyWeek } from './model';
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
    };

const FERTILE_BEFORE = 5;
const FERTILE_AFTER = 1;

const windowAround = (ovulation: IsoDate) => ({ start: addDays(ovulation, -FERTILE_BEFORE), end: addDays(ovulation, FERTILE_AFTER) });

/** O que a tela Hoje mostra sobre o ciclo, por modo. Função pura: `today` injetado. */
export function todayCycleView(profile: Profile, signals: CycleSignals, today: IsoDate): TodayView {
  if (profile.mode === 'pregnancy' && profile.dueDate) return { kind: 'pregnancy', ...pregnancyWeek(profile.dueDate, today) };
  if (profile.mode === 'no_bleeding') return { kind: 'no_bleeding' };

  const seed = profile.lastPeriodStart ? { start: profile.lastPeriodStart, length: profile.periodLength } : null;
  const model = buildCycleModel(
    { ...signals, seed, profileCycleLength: profile.cycleLength, profilePeriodLength: profile.periodLength },
    today,
  );
  const info = model && dayInfo(model, today, today);
  if (!model || !info) return { kind: 'none' };

  const currentWindow = windowAround(model.current.ovulation.date);
  const nextInfo = dayInfo(model, model.next.start, today);
  const fertile = today <= currentWindow.end || !nextInfo ? currentWindow : windowAround(nextInfo.ovulation.date);
  const expected = addDays(model.current.start, model.cycleLength);

  return {
    kind: 'cycle',
    phase: info.phase,
    cycleDay: info.cycleDay,
    daysToNext: daysBetween(today, model.next.start),
    late: model.late,
    ...(model.late ? { lateDays: daysBetween(expected, today) } : {}),
    next: model.next,
    fertile,
    confidence: model.confidence,
    painDays: predictPainDays(model.periods, signals.painDates, model.next.start),
  };
}
