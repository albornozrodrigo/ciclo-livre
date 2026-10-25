import type { IsoDate } from '@/domain/dates';

import { monthGrid } from './calendar';

/** Mês como número corrido (ano × 12 + mês − 1): soma e subtração atravessam o ano sem conta à parte. */
export const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

export const fromMonthIndex = (index: number) => ({ year: Math.floor(index / 12), month: (index % 12) + 1 });

const indexOf = (date: IsoDate) => monthIndex(Number(date.slice(0, 4)), Number(date.slice(5, 7)));

/** Quanto a lista mostra de saída em volta do mês atual. O futuro cresce conforme a pessoa rola. */
export const MONTHS_AROUND = 12;

/**
 * Meses da lista ao abrir: 12 para trás (para registrar um dia esquecido) ou desde o primeiro registro,
 * o que vier antes, até 12 para a frente.
 */
export function initialMonthRange(today: IsoDate, firstLogged: IsoDate | null) {
  const current = indexOf(today);
  const start = Math.min(current - MONTHS_AROUND, firstLogged ? indexOf(firstLogged) : current);
  return { start, current, end: current + MONTHS_AROUND };
}

export function weeksInMonth(year: number, month: number): number {
  return monthGrid(year, month, null, new Set(), '').length;
}
