import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { todayIso } from "@/domain/dates";
import { log } from "@/lib/logger";
import { useProfile } from "@/profile/profile-context";

import { syncReminders } from "./sync";

// Com o app aberto, o lembrete também aparece (sem som extra).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Mantém a agenda em dia e trata o toque nas notificações. Sem tarefa em segundo plano:
 * reagenda ao abrir, ao voltar e ao sair do app (sair cobre registros e perfil alterados na sessão).
 */
export function ReminderBridge() {
  const db = useSQLiteContext();
  const { state } = useProfile();
  const profile = state.status === "ready" ? state.profile : null;

  useEffect(() => {
    const sync = () =>
      syncReminders(db, profile).catch((error: unknown) =>
        log.error("reminders_sync_failed", error),
      );
    sync();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active" || status === "background") sync();
    });
    return () => subscription.remove();
  }, [db, profile]);

  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    if (response.notification.request.content.data?.kind === "daily_log")
      router.push(`/registro/${todayIso()}`);
  }, [response]);

  return null;
}
