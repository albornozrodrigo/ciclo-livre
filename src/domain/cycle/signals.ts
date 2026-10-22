import type { IsoDate } from '@/domain/dates';

/** Sinais registrados que alimentam o motor de previsão. */
export type CycleSignals = {
  flowDates: IsoDate[];
  temperatures: Record<IsoDate, number>;
  eggWhiteDates: IsoDate[];
  positiveOvulationTests: IsoDate[];
  painDates: IsoDate[];
};
