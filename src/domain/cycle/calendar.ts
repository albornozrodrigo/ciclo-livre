import { addDays, firstOfMonth, type IsoDate, toDayNumber } from '@/domain/dates';

import { type CycleModel, dayInfo, type Phase } from './model';

export type CalendarCell = {
  date: IsoDate;
  inMonth: boolean;
  phase: Phase | null;
  predicted: boolean;
  ovulation: boolean;
  today: boolean;
  logged: boolean;
};

/** Domingo = 0. 1970-01-01 (dia 0) foi uma quinta-feira. */
const weekday = (date: IsoDate) => ((((toDayNumber(date) ?? 0) + 4) % 7) + 7) % 7;

function lastDayOfMonth(year: number, month: number): IsoDate {
  return month === 12 ? addDays(firstOfMonth(year + 1, 1), -1) : addDays(firstOfMonth(year, month + 1), -1);
}

/**
 * Semanas (domingo a sábado) que cobrem o mês, com fase real ou prevista de cada dia.
 * `model` null (gravidez, sem sangramento, sem dados) → só marca hoje e registros.
 */
export function monthGrid(year: number, month: number, model: CycleModel | null, logged: ReadonlySet<IsoDate>, today: IsoDate): CalendarCell[][] {
  const first = firstOfMonth(year, month);
  const last = lastDayOfMonth(year, month);
  const start = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));
  const prefix = first.slice(0, 7);

  const weeks: CalendarCell[][] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const info = model ? dayInfo(model, date, today) : null;
    const cell: CalendarCell = {
      date,
      inMonth: date.startsWith(prefix),
      phase: info?.phase ?? null,
      predicted: info?.predicted ?? false,
      ovulation: info !== null && info.ovulation.date === date,
      today: date === today,
      logged: logged.has(date),
    };
    if (weekday(date) === 0) weeks.push([]);
    weeks[weeks.length - 1].push(cell);
  }
  return weeks;
}
