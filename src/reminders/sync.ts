import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications";

import { getCycleSignals } from "@/db/cycle-repo";
import { getDiscreet, listReminders } from "@/db/reminder-repo";
import type { SqlExecutor } from "@/db/types";
import { cycleModelFor } from "@/domain/cycle/for-profile";
import { dateFromIso, isoFromDate } from "@/domain/dates";
import type { Profile } from "@/domain/profile";
import { planSchedule } from "@/domain/reminders/schedule";
import { reminderContent } from "@/i18n/pt-BR-reminders";

export const CHANNEL_ID = "lembretes";

/** Canal único; conteúdo escondido na tela de bloqueio (dado de saúde). */
async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Lembretes",
    importance: AndroidImportance.DEFAULT,
    lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
  });
}

/** Pede a permissão de notificação. No Android 13+ o pedido só aparece depois que existe um canal. */
export async function requestReminderPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  await ensureChannel();
  const { granted, canAskAgain } =
    await Notifications.requestPermissionsAsync();
  return { granted, canAskAgain };
}

const localDateTime = (date: string, time: string) => {
  const d = dateFromIso(date);
  d.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  return d;
};

let queue: Promise<unknown> = Promise.resolve();

/**
 * Reagenda tudo a partir do banco: cancela os disparos do app e agenda a agenda dos próximos 60 dias.
 * Chamadas em sequência (uma nunca cancela no meio da outra).
 */
export function syncReminders(
  db: SqlExecutor,
  profile: Profile | null,
  now: Date = new Date(),
): Promise<void> {
  const run = queue.catch(() => undefined).then(() => doSync(db, profile, now));
  queue = run;
  return run;
}

async function doSync(db: SqlExecutor, profile: Profile | null, now: Date) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!profile) return;
  const [reminders, discreet, signals] = await Promise.all([
    listReminders(db),
    getDiscreet(db),
    getCycleSignals(db),
  ]);
  const today = isoFromDate(now);
  const fires = planSchedule({
    reminders,
    profile,
    model: cycleModelFor(profile, signals, today),
    now: { date: today, minutes: now.getHours() * 60 + now.getMinutes() },
  });
  if (fires.length === 0) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel();
  const byKind = new Map(reminders.map((r) => [r.kind, r]));
  for (const fire of fires) {
    const reminder = byKind.get(fire.kind);
    if (!reminder) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: fire.key,
      // Só o tipo vai nos dados (para abrir a tela certa); nada de registro de saúde.
      content: {
        ...reminderContent(reminder, fire.variant, discreet),
        data: { kind: fire.kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: localDateTime(fire.date, fire.time),
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** "Apagar tudo": nenhum lembrete pode disparar depois que os dados somem. */
export const cancelAllReminders = () =>
  Notifications.cancelAllScheduledNotificationsAsync();
