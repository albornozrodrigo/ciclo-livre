import { addDays, daysBetween, type IsoDate } from '@/domain/dates';

import { type CycleModel, dayInfo, fertileWindow } from './model';

export type Chance = 'low' | 'medium' | 'high';

/**
 * Chance de concepção por dia, em relação à ovulação estimada. Fonte: Wilcox, Weinberg e Baird,
 * NEJM 1995 (333:1517): 10%, 16%, 14% de 5 a 3 dias antes; 27%, 31% e 33% de 2 dias antes até o dia.
 * O dia seguinte fica "média" pela margem da estimativa, não pelo estudo.
 */
export function chanceFor(date: IsoDate, ovulation: IsoDate): Chance {
  const offset = daysBetween(ovulation, date);
  if (offset >= -2 && offset <= 0) return 'high';
  if ((offset >= -5 && offset <= -3) || offset === 1) return 'medium';
  return 'low';
}

export type ConceiveStatus = {
  chance: Chance;
  status:
    | { kind: 'best_in'; days: number }
    | { kind: 'last_fertile'; date: IsoDate }
    | { kind: 'test_from'; date: IsoDate; days: number }
    | { kind: 'late_test' };
};

/** Dias depois da ovulação para um teste de gravidez dar resultado confiável. */
const TEST_AFTER_OVULATION = 14;

/** Dia do teste do ciclo atual: a menstruação esperada ou 14 dias depois da ovulação, o que vier depois. */
export function pregnancyTestDate(model: CycleModel): IsoDate {
  const afterOvulation = addDays(model.current.ovulation.date, TEST_AFTER_OVULATION);
  return afterOvulation > model.expected ? afterOvulation : model.expected;
}

/** O que o modo Tentar engravidar mostra hoje: chance do dia e o próximo passo. */
export function conceiveStatus(model: CycleModel, today: IsoDate): ConceiveStatus {
  const ovulation = dayInfo(model, today, today)?.ovulation.date ?? model.current.ovulation.date;
  const chance = chanceFor(today, ovulation);
  if (model.late) return { chance, status: { kind: 'late_test' } };
  const window = fertileWindow(ovulation);
  const best = addDays(ovulation, -2);
  if (today < window.start || today < best) return { chance, status: { kind: 'best_in', days: daysBetween(today, best) } };
  if (today <= window.end) return { chance, status: { kind: 'last_fertile', date: window.end } };
  const test = pregnancyTestDate(model);
  return { chance, status: { kind: 'test_from', date: test, days: daysBetween(today, test) } };
}
