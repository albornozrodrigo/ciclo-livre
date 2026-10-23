import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { getRandomBytes } from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';

import { getCycleSignals } from '@/db/cycle-repo';
import { getDiscreet, getReminderIdSecret, listReminders } from '@/db/reminder-repo';
import type { SqlExecutor } from '@/db/types';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import { dateFromIso, isoFromDate } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { planSchedule } from '@/domain/reminders/schedule';
import { reminderContent } from '@/i18n/pt-BR-reminders';

/**
 * Dois canais (a pessoa pode silenciar um sem o outro nos ajustes do Android):
 * - `private`: texto do lembrete. Pedimos SECRET, mas o Android aplica a visibilidade do canal
 *   conforme o ajuste do sistema (testado no S21 FE: ficou "sem substituição"). Por isso a proteção real
 *   é o modo discreto ligado por padrão; com ele desligado, a tela de bloqueio segue o ajuste
 *   "conteúdo sensível" do Android, e a tela de lembretes diz isso.
 * - `discreet`: texto neutro ("Você tem um lembrete").
 */
export const CHANNELS = { private: 'lembretes-privados', discreet: 'lembretes-discretos' } as const;
/** Canal da primeira versão (PRIVATE mostra o texto se o sistema não esconder conteúdo sensível). */
const LEGACY_CHANNEL = 'lembretes';

async function ensureChannels() {
  await Notifications.setNotificationChannelAsync(CHANNELS.private, {
    name: 'Lembretes',
    importance: AndroidImportance.DEFAULT,
    lockscreenVisibility: AndroidNotificationVisibility.SECRET,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.discreet, {
    name: 'Lembretes discretos',
    importance: AndroidImportance.DEFAULT,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL);
}

/** Pede a permissão de notificação. No Android 13+ o pedido só aparece depois que existe um canal. */
export async function requestReminderPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  await ensureChannels();
  const { granted, canAskAgain } = await Notifications.requestPermissionsAsync();
  return { granted, canAskAgain };
}

const localDateTime = (date: string, time: string) => {
  const d = dateFromIso(date);
  d.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  return d;
};

/**
 * Identificador opaco. O expo-notifications guarda a agenda em SharedPreferences (texto puro, fora do SQLCipher):
 * "period_due:2026-11-03" ali revelaria a data prevista. O hash com segredo do banco muda quando muda o tipo,
 * a data, o horário, o canal ou o texto, e mantém o "agenda só o que mudou".
 */
function opaqueId(secret: string, parts: string): string {
  return `r_${bytesToHex(sha256(utf8ToBytes(`${secret}|${parts}`))).slice(0, 32)}`;
}

let queue: Promise<unknown> = Promise.resolve();
/** Muda a cada "apagar tudo": um reagendamento em curso para no próximo passo. */
let generation = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.catch(() => undefined).then(task);
  queue = run;
  return run;
}

/**
 * Deixa os alarmes do aparelho iguais à agenda dos próximos 60 dias: cancela só o que saiu e agenda
 * só o que falta (sem "cancelar tudo e refazer", que deixaria a agenda vazia se o app morrer no meio).
 */
export function syncReminders(db: SqlExecutor, profile: Profile | null, now: Date = new Date()): Promise<void> {
  const started = generation;
  return enqueue(() => doSync(db, profile, now, started));
}

async function doSync(db: SqlExecutor, profile: Profile | null, now: Date, started: number) {
  if (started !== generation) return;
  const granted = profile ? (await Notifications.getPermissionsAsync()).granted : false;
  if (!profile || !granted) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const [reminders, discreet, signals, secret] = await Promise.all([
    listReminders(db),
    getDiscreet(db),
    getCycleSignals(db),
    getReminderIdSecret(db, getRandomBytes),
  ]);
  const today = isoFromDate(now);
  const fires = planSchedule({
    reminders,
    profile,
    model: cycleModelFor(profile, signals, today),
    now: { date: today, minutes: now.getHours() * 60 + now.getMinutes() },
  });
  await ensureChannels();
  const channelId = discreet ? CHANNELS.discreet : CHANNELS.private;
  const byKind = new Map(reminders.map((r) => [r.kind, r]));

  const wanted = new Map<string, Notifications.NotificationRequestInput>();
  for (const fire of fires) {
    const reminder = byKind.get(fire.kind);
    if (!reminder) continue;
    const content = reminderContent(reminder, fire.variant, discreet);
    const identifier = opaqueId(secret, `${fire.key}@${fire.time}|${channelId}|${content.title}|${content.body}`);
    wanted.set(identifier, {
      identifier,
      // Dados também ficam em texto puro: só o lembrete diário leva a data (para abrir o registro do dia).
      content: { ...content, data: fire.kind === 'daily_log' ? { kind: fire.kind, date: fire.date } : {} },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: localDateTime(fire.date, fire.time), channelId },
    });
  }

  const existing = new Set((await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier));
  for (const id of existing) {
    if (started !== generation) return;
    if (!wanted.has(id)) await Notifications.cancelScheduledNotificationAsync(id);
  }
  for (const [id, request] of wanted) {
    if (started !== generation) return;
    if (!existing.has(id)) await Notifications.scheduleNotificationAsync(request);
  }
}

/** "Apagar tudo": interrompe qualquer reagendamento em curso e cancela tudo depois dele. */
export function cancelAllReminders(): Promise<void> {
  generation += 1;
  return enqueue(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    // As já exibidas também saem da bandeja.
    await Notifications.dismissAllNotificationsAsync();
  });
}
