import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isValidDate } from '@/domain/dates';
import { useProfile } from '@/profile/profile-context';

import { syncReminders } from './sync';
import { logUnlessClosed } from '@/db/closed';

/** Toques já tratados: no módulo, para sobreviver à remontagem da ponte (o último toque continua disponível). */
const handled = new Set<string>();

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
  const profile = state.status === 'ready' ? state.profile : null;

  useEffect(() => {
    const sync = () => syncReminders(db, profile).catch((error: unknown) => logUnlessClosed('reminders_sync_failed', error));
    sync();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active' || status === 'background') sync();
    });
    return () => subscription.remove();
  }, [db, profile]);

  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);
    const data = response.notification.request.content.data ?? {};
    // Dado vindo de fora do JS: só segue com uma data de calendário válida.
    if (data.kind === 'daily_log' && isValidDate(data.date)) {
      router.push(`/registro/${data.date}`);
    }
  }, [response]);

  return null;
}
