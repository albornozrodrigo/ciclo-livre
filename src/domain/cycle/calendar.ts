import { addDays, type IsoDate, toDayNumber } from '@/domain/dates';

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

const pad = (n: number) => String(n).padStart(2, '0');

/** Domingo = 0. 1970-01-01 (dia 0) foi uma quinta-feira. */
const weekday = (date: IsoDate) => ((toDayNumber(date) ?? 0) + 4) % 7;

function lastDayOfMonth(year: number, month: number): IsoDate {
  const [nextYear, nextMonth] = month === 12 ? [year + 1, 1] : [year, month + 1];
  return addDays(`${nextYear}-${pad(nextMonth)}-01`, -1);
}

/**
 * Semanas (domingo a sábado) que cobrem o mês, com fase real ou prevista de cada dia.
 * `model` null (gravidez, sem sangramento, sem dados) → só marca hoje e registros.
 */
export function monthGrid(year: number, month: number, model: CycleModel | null, logged: ReadonlySet<IsoDate>, today: IsoDate): CalendarCell[][] {
  const first = `${year}-${pad(month)}-01`;
  const last = lastDayOfMonth(year, month);
  const start = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));
  const prefix = `${year}-${pad(month)}`;

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
