import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  getDiscreet,
  listReminders,
  saveReminder,
  setDiscreet,
} from "@/db/reminder-repo";
import type { Reminder } from "@/domain/reminders/catalog";
import { log } from "@/lib/logger";
import { useProfile } from "@/profile/profile-context";

import { requestReminderPermission, syncReminders } from "./sync";

type Data = { reminders: Reminder[]; discreet: boolean };

/** Lembretes salvos + permissão; salvar já reagenda as notificações. */
export function useReminders() {
  const db = useSQLiteContext();
  const { state } = useProfile();
  const profile = state.status === "ready" ? state.profile : null;
  const [data, setData] = useState<Data | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    const [reminders, discreet, permission] = await Promise.all([
      listReminders(db),
      getDiscreet(db),
      Notifications.getPermissionsAsync(),
    ]);
    setData({ reminders, discreet });
    // Lembrete ligado sem permissão (a pessoa desligou nos ajustes): avisar.
    setDenied(!permission.granted && reminders.some((r) => r.enabled));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load().catch((error: unknown) =>
        log.error("reminders_load_failed", error),
      );
    }, [load]),
  );

  // Voltando dos ajustes do sistema, a permissão pode ter mudado.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active")
        load().catch((error: unknown) =>
          log.error("reminders_load_failed", error),
        );
    });
    return () => subscription.remove();
  }, [load]);

  const resync = useCallback(() => {
    syncReminders(db, profile).catch((error: unknown) =>
      log.error("reminders_sync_failed", error),
    );
  }, [db, profile]);

  /** Garante a permissão; negada, mostra a explicação e devolve false. */
  const ensurePermission = useCallback(async () => {
    if ((await Notifications.getPermissionsAsync()).granted) return true;
    const { granted } = await requestReminderPermission();
    setDenied(!granted);
    return granted;
  }, []);

  /** Salva; ligar sem permissão concedida não salva e devolve false. */
  const save = useCallback(
    async (next: Reminder) => {
      if (next.enabled && !(await ensurePermission())) return false;
      await saveReminder(db, next);
      await load();
      resync();
      return true;
    },
    [db, ensurePermission, load, resync],
  );

  const saveDiscreet = useCallback(
    async (discreet: boolean) => {
      await setDiscreet(db, discreet);
      setData((d) => (d ? { ...d, discreet } : d));
      resync();
    },
    [db, resync],
  );

  return { profile, data, denied, save, saveDiscreet };
}
