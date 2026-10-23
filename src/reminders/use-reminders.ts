import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getDiscreet, listReminders, saveReminder, setDiscreet } from '@/db/reminder-repo';
import type { Reminder } from '@/domain/reminders/catalog';
import { useProfile } from '@/profile/profile-context';

import { requestReminderPermission, syncReminders } from './sync';
import { logUnlessClosed } from '@/db/closed';

type Data = { reminders: Reminder[]; discreet: boolean };

/** Lembretes salvos + permissão; salvar já reagenda as notificações. */
export function useReminders() {
  const db = useSQLiteContext();
  const { state } = useProfile();
  const profile = state.status === 'ready' ? state.profile : null;
  const [data, setData] = useState<Data | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    const [reminders, discreet, permission] = await Promise.all([listReminders(db), getDiscreet(db), Notifications.getPermissionsAsync()]);
    setData({ reminders, discreet });
    // Sem permissão: avisa se há lembrete ligado ou se a pessoa acabou de negar; com permissão, some.
    setDenied((wasDenied) => !permission.granted && (wasDenied || reminders.some((r) => r.enabled)));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load().catch((error: unknown) => logUnlessClosed('reminders_load_failed', error));
    }, [load]),
  );

  // Voltando dos ajustes do sistema, a permissão pode ter mudado.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') load().catch((error: unknown) => logUnlessClosed('reminders_load_failed', error));
    });
    return () => subscription.remove();
  }, [load]);

  const resync = useCallback(() => {
    syncReminders(db, profile).catch((error: unknown) => logUnlessClosed('reminders_sync_failed', error));
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
      // Reagenda antes de recarregar: se a releitura falhar, a mudança salva já está agendada.
      resync();
      await load();
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
