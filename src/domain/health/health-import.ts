import { type IsoDate, isValidDate } from '@/domain/dates';
import { categoryById } from '@/domain/tracking/catalog';
import { validateMeasure } from '@/domain/tracking/rules';
import { sleepBucket } from '@/domain/tracking/sleep';

/** Amostra pontual (peso, temperatura, FC, VFC): instante ISO, fuso do registro em segundos (se vier) e valor. */
export type InstantSample = { time: string; offsetSeconds?: number; value: number };
/** Sessão de sono: início e fim ISO; fuso do fim (se vier). */
export type SleepSample = { startTime: string; endTime: string; endOffsetSeconds?: number };

export type HealthInput = {
  weight?: InstantSample[];
  basalTemperature?: InstantSample[];
  restingHeartRate?: InstantSample[];
  hrv?: InstantSample[];
  sleep?: SleepSample[];
};

export type HealthImport = {
  measures: { date: IsoDate; category: string; value: number }[];
  selections: { date: IsoDate; category: 'sleep'; option: string }[];
  /** Registros descartados (valor fora da faixa, data absurda, sessão inválida). */
  dropped: number;
  days: number;
};

/** Fuso do aparelho (segundos) num instante; injetado para teste. */
export type DeviceOffset = (iso: string) => number;
export const deviceOffset: DeviceOffset = (iso) => -new Date(iso).getTimezoneOffset() * 60;

const MAX_SLEEP_MS = 24 * 60 * 60 * 1000;

/** Data de calendário local do instante (fuso do registro ou do aparelho), ou null se inválida. */
function localDate(iso: string, offsetSeconds: number | undefined, device: DeviceOffset): IsoDate | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms + (offsetSeconds ?? device(iso)) * 1000).toISOString().slice(0, 10);
  return isValidDate(date) ? date : null;
}

type Reducer = (values: { ms: number; value: number }[]) => number;
const last: Reducer = (v) => v.reduce((a, b) => (b.ms >= a.ms ? b : a)).value;
const first: Reducer = (v) => v.reduce((a, b) => (b.ms < a.ms ? b : a)).value;
const lowest: Reducer = (v) => Math.min(...v.map((x) => x.value));
const mean: Reducer = (v) => v.reduce((a, b) => a + b.value, 0) / v.length;

/** Soma de intervalos sem contar duas vezes o que se sobrepõe. */
function unionMs(intervals: [number, number][]): number {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [curStart, curEnd] = sorted[0];
  for (const [s, e] of sorted.slice(1)) {
    if (s <= curEnd) curEnd = Math.max(curEnd, e);
    else {
      total += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  return total + (curEnd - curStart);
}

/**
 * Converte registros do Health Connect em um valor por dia (data local do registro):
 * peso = último do dia; temperatura basal = primeira (ao acordar); FC em repouso = menor; VFC = média;
 * sono = união das sessões que terminam no dia → faixa. Valor fora do catálogo é descartado e contado.
 */
export function mapHealthConnect(input: HealthInput, device: DeviceOffset = deviceOffset): HealthImport {
  const measures: HealthImport['measures'] = [];
  const selections: HealthImport['selections'] = [];
  const dates = new Set<IsoDate>();
  let dropped = 0;

  const daily = (samples: InstantSample[] | undefined, category: string, pick: Reducer) => {
    const byDay = new Map<IsoDate, { ms: number; value: number }[]>();
    for (const s of samples ?? []) {
      const date = localDate(s.time, s.offsetSeconds, device);
      if (!date || !Number.isFinite(s.value)) {
        dropped += 1;
        continue;
      }
      const list = byDay.get(date) ?? [];
      list.push({ ms: Date.parse(s.time), value: s.value });
      byDay.set(date, list);
    }
    const cat = categoryById(category);
    const decimals = cat?.kind === 'measure' ? cat.decimals : 0;
    for (const [date, values] of byDay) {
      const value = Math.round(pick(values) * 10 ** decimals) / 10 ** decimals;
      if (validateMeasure(category, value) !== null) {
        dropped += values.length;
        continue;
      }
      measures.push({ date, category, value });
      dates.add(date);
    }
  };

  daily(input.weight, 'weight', last);
  daily(input.basalTemperature, 'temperature', first);
  daily(input.restingHeartRate, 'resting_heart_rate', lowest);
  daily(input.hrv, 'hrv', mean);

  const nights = new Map<IsoDate, [number, number][]>();
  for (const s of input.sleep ?? []) {
    const start = Date.parse(s.startTime);
    const end = Date.parse(s.endTime);
    const date = localDate(s.endTime, s.endOffsetSeconds, device);
    if (!date || !Number.isFinite(start) || !(end > start) || end - start > MAX_SLEEP_MS) {
      dropped += 1;
      continue;
    }
    nights.set(date, [...(nights.get(date) ?? []), [start, end]]);
  }
  for (const [date, intervals] of nights) {
    selections.push({ date, category: 'sleep', option: sleepBucket(unionMs(intervals) / 60_000) });
    dates.add(date);
  }

  measures.sort((a, b) => (a.date === b.date ? a.category.localeCompare(b.category) : a.date < b.date ? -1 : 1));
  selections.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { measures, selections, dropped, days: dates.size };
}
