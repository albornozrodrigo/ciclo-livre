import { pregnancyTestDate } from '@/domain/cycle/conceive';
import { type CycleModel, dayInfo, type Phase } from '@/domain/cycle/model';
import { addDays, daysBetween, type IsoDate, isValidDate } from '@/domain/dates';
import type { Profile } from '@/domain/profile';

import { anchorFor, availableKinds, birthControlPlan, DEVICE_YEARS, type Reminder, type ReminderKind } from './catalog';

/** A agenda só é recalculada quando o app abre: 60 dias cobrem quem fica semanas sem abrir. */
export const HORIZON_DAYS = 60;
/**
 * Limite de alarmes pendentes (o Android aceita ~500 por app). Alto o bastante para dois lembretes
 * diários cobrirem os 60 dias inteiros; só corta numa combinação extrema.
 */
export const MAX_FIRES = 200;

const PACK_DAYS = 28;
const ACTIVE_DAYS = 21;
const INJECTION_DAYS = 84;
const INJECTION_NOTICE = 7;
const FREQUENCY_DAYS = {
  daily: 1,
  every_3_days: 3,
  weekly: 7,
  fortnightly: 14,
} as const;

export type Variant =
  | 'period_soon'
  | 'period_due'
  | 'period_late'
  | 'fertile_soon'
  | `phase_${Phase}`
  | 'pill'
  | 'patch_change'
  | 'patch_off'
  | 'ring_insert'
  | 'ring_remove'
  | 'injection_soon'
  | 'injection_due'
  | 'iud_threads'
  | 'device_change_soon'
  | 'device_change_due'
  | 'device_overdue'
  | 'daily_log'
  | 'pregnancy_test';

/** Um disparo: data e hora locais. `key` é estável para cancelar e reagendar sem duplicar. */
export type Fire = {
  key: string;
  kind: ReminderKind;
  variant: Variant;
  date: IsoDate;
  time: string;
};

/** "Agora" em hora local: data de calendário + minutos desde a meia-noite. */
export type Clock = { date: IsoDate; minutes: number };

type Input = {
  reminders: readonly Reminder[];
  profile: Profile;
  model: CycleModel | null;
  now: Clock;
};
type Occurrence = { date: IsoDate; variant: Variant };

const mod = (n: number, m: number) => ((n % m) + m) % m;
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const dayOfMonth = (d: IsoDate) => Number(d.slice(8, 10));
const isLastOfMonth = (d: IsoDate) => addDays(d, 1).slice(5, 7) !== d.slice(5, 7);

function windowDays(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Menstruação: a partir da data esperada, repetindo a duração média. Em atraso, só o aviso de atraso. */
function periodDates(kind: ReminderKind, r: Reminder, model: CycleModel, today: IsoDate, end: IsoDate): Occurrence[] {
  if (kind === 'period_late') {
    const date = addDays(model.expected, 1);
    return date >= today ? [{ date, variant: 'period_late' }] : [];
  }
  if (model.late) return [];
  const before = kind === 'period_soon' ? r.options.daysBefore : 0;
  const out: Occurrence[] = [];
  for (let start = model.expected; addDays(start, -before) <= end; start = addDays(start, model.cycleLength)) {
    const date = addDays(start, -before);
    if (date >= today) out.push({ date, variant: kind as 'period_soon' | 'period_due' });
  }
  return out;
}

/** Teste de gravidez em cada ciclo da janela: o do ciclo atual (ovulação real) e, depois, a cada ciclo previsto. */
function pregnancyTestDates(model: CycleModel, today: IsoDate, end: IsoDate): Occurrence[] {
  // Com atraso, Hoje já diz que dá para testar.
  if (model.late) return [];
  const out: Occurrence[] = [];
  const first = pregnancyTestDate(model);
  for (let date = first; date <= end; date = addDays(date, model.cycleLength)) {
    if (date >= today) out.push({ date, variant: 'pregnancy_test' });
  }
  return out;
}

/** Fases e janela fértil: as mesmas transições que o calendário mostra (dayInfo). */
function phaseDates(kind: ReminderKind, model: CycleModel, today: IsoDate, end: IsoDate): Occurrence[] {
  if (model.late) return [];
  const phaseAt = (d: IsoDate) => dayInfo(model, d, today)?.phase ?? null;
  const out: Occurrence[] = [];
  if (kind === 'phase_change') {
    for (const d of windowDays(today, end)) {
      const phase = phaseAt(d);
      if (phase && phase !== phaseAt(addDays(d, -1))) out.push({ date: d, variant: `phase_${phase}` });
    }
  } else {
    // Um dia antes do início de cada janela fértil.
    for (const d of windowDays(addDays(today, 1), addDays(end, 1))) {
      if (phaseAt(d) === 'fertile' && phaseAt(addDays(d, -1)) !== 'fertile') out.push({ date: addDays(d, -1), variant: 'fertile_soon' });
    }
  }
  return out;
}

const DEVICE_NOTICE = 30;

/** Mesmo dia do mês da referência (em mês mais curto, o último dia). */
function monthlyFrom(anchor: IsoDate, today: IsoDate, end: IsoDate): IsoDate[] {
  const target = dayOfMonth(anchor);
  return windowDays(today, end).filter((d) => dayOfMonth(d) === target || (isLastOfMonth(d) && dayOfMonth(d) < target));
}

/** Data em que vence o DIU/implante: mesma data, N anos depois (29/02 cai em 28/02). */
function addYears(date: IsoDate, years: number): IsoDate {
  const sameDay = `${String(Number(date.slice(0, 4)) + years).padStart(4, '0')}${date.slice(4)}`;
  const lastOfFebruary = addDays(`${sameDay.slice(0, 8)}01`, 27);
  return isValidDate(sameDay) ? sameDay : lastOfFebruary;
}

type DevicePlan = 'iud_hormonal' | 'iud_copper' | 'implant';
export const isDevicePlan = (plan: string | null): plan is DevicePlan =>
  plan === 'iud_hormonal' || plan === 'iud_copper' || plan === 'implant';

/** Data em que vence o DIU/implante pela validade informada (ou a padrão do método). */
export function deviceDueDate(r: Reminder, plan: DevicePlan, anchor: IsoDate): IsoDate {
  return addYears(anchor, r.options.years ?? DEVICE_YEARS[plan]);
}

/** DIU (fios e troca) e implante (troca). Nada antes da colocação. */
function deviceDates(r: Reminder, plan: DevicePlan, anchor: IsoDate, model: CycleModel | null, today: IsoDate, end: IsoDate): Occurrence[] {
  const out: Occurrence[] = [];
  const from = anchor >= today ? addDays(anchor, 1) : today;
  if (plan !== 'implant' && r.options.threads !== 'never') {
    if (r.options.threads === 'after_period' && model && !model.late) {
      // Dia seguinte ao fim da menstruação atual (se ainda não passou) e de cada uma das previstas.
      const ends = [model.current.periodEnd];
      for (let start = model.expected; start <= end; start = addDays(start, model.cycleLength))
        ends.push(addDays(start, model.periodLength - 1));
      for (const last of ends) {
        const date = addDays(last, 1);
        if (date >= from && date <= end) out.push({ date, variant: 'iud_threads' });
      }
    } else {
      // "Todo mês", ou "depois da menstruação" sem ciclo previsto (sem sangramento, atraso): no dia da colocação.
      for (const date of monthlyFrom(anchor, from, end)) out.push({ date, variant: 'iud_threads' });
    }
  }
  const due = deviceDueDate(r, plan, anchor);
  if (due < today) {
    // Venceu: avisa todo mês, no dia do vencimento, até a pessoa atualizar a data ou a validade.
    for (const date of monthlyFrom(due, today, end)) out.push({ date, variant: 'device_overdue' });
    return out;
  }
  const soon = addDays(due, -DEVICE_NOTICE);
  if (soon >= today && soon <= end) out.push({ date: soon, variant: 'device_change_soon' });
  if (due <= end) out.push({ date: due, variant: 'device_change_due' });
  return out;
}

function birthControlDates(r: Reminder, profile: Profile, model: CycleModel | null, today: IsoDate, end: IsoDate): Occurrence[] {
  const plan = birthControlPlan(profile.birthControl);
  const { pack } = r.options;
  // Data de outro método (ex.: trocou pílula por injeção) não vale.
  const anchor = anchorFor(r, profile);
  if (plan === 'pill' && pack === 'continuous') return windowDays(today, end).map((date) => ({ date, variant: 'pill' }));
  if (!plan || !anchor) return [];
  if (isDevicePlan(plan)) return deviceDates(r, plan, anchor, model, today, end);

  if (plan === 'injection') {
    const out: Occurrence[] = [];
    for (let due = addDays(anchor, INJECTION_DAYS); addDays(due, -INJECTION_NOTICE) <= end; due = addDays(due, INJECTION_DAYS)) {
      const soon = addDays(due, -INJECTION_NOTICE);
      if (soon >= today) out.push({ date: soon, variant: 'injection_soon' });
      if (due >= today && due <= end) out.push({ date: due, variant: 'injection_due' });
    }
    return out;
  }

  // Pílula 21+7, adesivo e anel seguem o ciclo de 28 dias a partir da referência.
  return windowDays(today, end).flatMap((date): Occurrence[] => {
    const day = mod(daysBetween(anchor, date), PACK_DAYS);
    if (plan === 'pill') return day < ACTIVE_DAYS ? [{ date, variant: 'pill' }] : [];
    if (plan === 'patch') {
      if (day === ACTIVE_DAYS) return [{ date, variant: 'patch_off' }];
      return day % 7 === 0 ? [{ date, variant: 'patch_change' }] : [];
    }
    if (day === 0) return [{ date, variant: 'ring_insert' }];
    return day === ACTIVE_DAYS ? [{ date, variant: 'ring_remove' }] : [];
  });
}

function dailyLogDates(r: Reminder, today: IsoDate, end: IsoDate): Occurrence[] {
  const anchor = r.options.anchor ?? today;
  const { frequency } = r.options;
  return windowDays(today, end)
    .filter((d) => {
      if (frequency !== 'monthly') return mod(daysBetween(anchor, d), FREQUENCY_DAYS[frequency]) === 0;
      // Mesmo dia do mês; em mês mais curto, o último dia.
      const target = dayOfMonth(anchor);
      return dayOfMonth(d) === target || (isLastOfMonth(d) && dayOfMonth(d) < target);
    })
    .map((date) => ({ date, variant: 'daily_log' }));
}

/** Agenda dos lembretes ligados que valem no modo atual: próximos 60 dias, nada no passado, no máximo 64. */
export function planSchedule({ reminders, profile, model, now }: Input): Fire[] {
  const today = now.date;
  const end = addDays(today, HORIZON_DAYS);
  const allowed = new Set(availableKinds(profile));

  const fires = reminders
    .filter((r) => r.enabled && allowed.has(r.kind))
    .flatMap((r) => {
      let occurrences: Occurrence[] = [];
      if (r.kind === 'birth_control') occurrences = birthControlDates(r, profile, model, today, end);
      else if (r.kind === 'daily_log') occurrences = dailyLogDates(r, today, end);
      // No dia em que a menstruação é esperada; com atraso, Hoje já diz que dá para testar.
      else if (r.kind === 'pregnancy_test') occurrences = model ? pregnancyTestDates(model, today, end) : [];
      else if (model && (r.kind === 'fertile_soon' || r.kind === 'phase_change')) occurrences = phaseDates(r.kind, model, today, end);
      else if (model) occurrences = periodDates(r.kind, r, model, today, end);
      return occurrences
        .filter((o) => o.date <= end && (o.date > today || minutesOf(r.time) > now.minutes))
        .map((o): Fire => ({
          key: `${o.variant}:${o.date}`,
          kind: r.kind,
          variant: o.variant,
          date: o.date,
          time: r.time,
        }));
    });

  const order = (f: Fire) => `${f.date} ${f.time} ${f.key}`;
  return fires.sort((a, b) => (order(a) < order(b) ? -1 : 1)).slice(0, MAX_FIRES);
}
