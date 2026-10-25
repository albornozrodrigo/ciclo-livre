import { addDays, daysBetween, type IsoDate } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

import { type ConceiveStatus, conceiveStatus } from './conceive';
import { cycleModelFor } from './for-profile';
import { type LikelySymptom, predictLikelyToday } from './likely-today';
import { type Confidence, dayInfo, fertileWindow, type Phase, pregnancyWeek } from './model';
import { predictPainDays } from './pain';
import type { CycleSignals } from './signals';

export type TodayView =
  | { kind: 'none' }
  | { kind: 'no_bleeding' }
  | { kind: 'pregnancy'; week: number; day: number; daysToDue: number; twins: boolean }
  /** Pós-parto: tempo desde o parto; `periodBack` quando há menstruação registrada depois dele. */
  | { kind: 'postpartum'; weeks: number; days: number; months: number; periodBack: boolean }
  | {
      kind: 'cycle';
      phase: Phase;
      cycleDay: number;
      daysToNext: number;
      late: boolean;
      lateDays?: number;
      next: { start: IsoDate; earliest: IsoDate; latest: IsoDate };
      /** Janela fértil atual, ou a do próximo ciclo se a atual já passou; null com contracepção hormonal. */
      fertile: { start: IsoDate; end: IsoDate } | null;
      fertilityHidden: boolean;
      confidence: Confidence;
      painDays: IsoDate[];
      /** "Pode aparecer hoje": até 3 sintomas que costumam vir neste ponto do ciclo. */
      likelyToday: LikelySymptom[];
      /** Fase que vem depois da de hoje e em quantos dias ela começa (lobo secundário de Hoje). */
      nextPhase: { phase: Phase; inDays: number } | null;
      /** Só no modo Tentar engravidar: chance do dia e próximo passo. */
      conceive?: ConceiveStatus;
    };

/** Procura o primeiro dia à frente com outra fase (no máximo um ciclo longo). */
function findNextPhase(model: NonNullable<ReturnType<typeof cycleModelFor>>, phase: Phase, today: IsoDate) {
  for (let d = 1; d <= 60; d++) {
    const info = dayInfo(model, addDays(today, d), today);
    if (info && info.phase !== phase) return { phase: info.phase, inDays: d };
  }
  return null;
}

/** Dias depois do parto a partir dos quais um sangramento registrado conta como a menstruação de volta. */
const POSTPARTUM_PERIOD_GRACE = 42;

/** Meses completos de calendário entre duas datas. */
function monthsBetween(from: IsoDate, to: IsoDate): number {
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));
  return Math.max(0, Number(to.slice(8, 10)) < Number(from.slice(8, 10)) ? months - 1 : months);
}

/** O que a tela Hoje mostra sobre o ciclo, por modo. Função pura: `today` injetado. */
export function todayCycleView(profile: Profile, signals: CycleSignals, today: IsoDate): TodayView {
  if (profile.mode === 'pregnancy' && profile.dueDate)
    return { kind: 'pregnancy', ...pregnancyWeek(profile.dueDate, today), twins: profile.twins };
  if (profile.mode === 'no_bleeding') return { kind: 'no_bleeding' };
  if (profile.mode === 'postpartum') {
    if (!profile.babyBirth) return { kind: 'none' };
    const birth = profile.babyBirth;
    const since = Math.max(0, daysBetween(birth, today));
    return {
      kind: 'postpartum',
      weeks: Math.floor(since / 7),
      days: since % 7,
      months: monthsBetween(birth, today),
      // Nas primeiras 6 semanas um sangramento é quase sempre lóquio, mesmo marcado como menstruação.
      periodBack: signals.flowDates.some((d) => daysBetween(birth, d) >= POSTPARTUM_PERIOD_GRACE),
    };
  }

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
    fertile: model.fertilityHidden ? null : fertile,
    fertilityHidden: model.fertilityHidden,
    confidence: model.confidence,
    painDays: predictPainDays(model.periods, signals.painDates, model.next.start),
    likelyToday: predictLikelyToday(model, signals.symptoms ?? [], today),
    nextPhase: model.late ? null : findNextPhase(model, info.phase, today),
    ...(profile.mode === 'conceive' && !model.fertilityHidden ? { conceive: conceiveStatus(model, today) } : {}),
  };
}
