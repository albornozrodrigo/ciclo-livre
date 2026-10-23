import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { SwitchRow } from '@/components/reminders/switch-row';
import { useSnackbar } from '@/components/ui/snackbar';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

import { authenticate, useSecurity } from './app-lock';

const s = ptBR.security;

/** Interruptores de proteção em Privacidade e segurança. A trava só aparece se o aparelho tiver PIN ou biometria. */
export function SecuritySettings() {
  const { settings, setLock, setHide } = useSecurity();
  const { show } = useSnackbar();
  const [canLock, setCanLock] = useState<boolean | null>(null);

  // Relido ao voltar ao app: a pessoa pode ter cadastrado (ou tirado) o PIN nas configurações do Android.
  useEffect(() => {
    const check = () =>
      LocalAuthentication.getEnrolledLevelAsync()
        .then((level) => setCanLock(level >= LocalAuthentication.SecurityLevel.SECRET))
        .catch((e: unknown) => {
          log.error('auth_level_failed', e);
          setCanLock(false);
        });
    check();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    return () => sub.remove();
  }, []);

  if (!settings || canLock === null) return null;

  const save = (task: Promise<void>) =>
    task.catch((e: unknown) => {
      log.error('security_save_failed', e);
      show(s.saveFailed);
    });

  async function toggleLock(on: boolean) {
    if (on) {
      // Confirma antes: ninguém liga uma trava que não consegue abrir.
      if (!(await authenticate())) return;
      await setLock(true);
      if (!settings?.hideRecents) await setHide(true);
    } else await setLock(false);
  }

  return (
    <View>
      {canLock ? (
        <SwitchRow label={s.lock} detail={s.lockHint} value={settings.lock} onValueChange={(on) => save(toggleLock(on))} />
      ) : (
        <Text className="py-2 text-base leading-6 text-ink-muted dark:text-ink-muted-night">{s.noCredential}</Text>
      )}
      <SwitchRow label={s.hideRecents} detail={s.hideRecentsHint} value={settings.hideRecents} onValueChange={(on) => save(setHide(on))} />
    </View>
  );
}
