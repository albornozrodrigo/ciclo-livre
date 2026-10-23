import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { getSecuritySettings, type SecuritySettings, setAppLock, setHideRecents } from '@/db/security-settings-repo';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

import { isLockSuppressed, shouldLockOnReturn, withLockSuppressed } from './lock-policy';

const s = ptBR.security;
const CAPTURE_KEY = 'ciclo-livre';

type SecurityValue = {
  settings: SecuritySettings | null;
  setLock: (on: boolean) => Promise<void>;
  setHide: (on: boolean) => Promise<void>;
};

const SecurityContext = createContext<SecurityValue | null>(null);

export function useSecurity(): SecurityValue {
  const value = useContext(SecurityContext);
  if (!value) throw new Error('useSecurity fora do SecurityProvider');
  return value;
}

/** Pede a credencial do aparelho (biometria com PIN/padrão de reserva). Sair para o PIN não conta como sair do app. */
export async function authenticate(): Promise<boolean> {
  const result = await withLockSuppressed(() =>
    LocalAuthentication.authenticateAsync({ promptMessage: s.prompt, cancelLabel: s.cancel, disableDeviceFallback: false }),
  );
  return result.success;
}

/** Configurações de proteção do aparelho, lidas do banco cifrado. */
export function SecurityProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    getSecuritySettings(db)
      .then(setSettings)
      .catch((e: unknown) => {
        log.error('security_load_failed', e);
        // Na dúvida, sem trava: um erro de leitura não pode trancar a pessoa fora dos próprios dados.
        setSettings({ lock: false, hideRecents: false });
      });
  }, [db]);

  const value = useMemo<SecurityValue>(
    () => ({
      settings,
      setLock: async (on) => {
        await setAppLock(db, on);
        setSettings(await getSecuritySettings(db));
      },
      setHide: async (on) => {
        await setHideRecents(db, on);
        setSettings(await getSecuritySettings(db));
      },
    }),
    [db, settings],
  );
  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }}
      className="flex-1 justify-between bg-water px-5 dark:bg-water-night">
      <StatusBar style="auto" />
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night">
          {s.locked}
        </Text>
        <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{s.lockedHint}</Text>
      </View>
      <CapsuleButton label={s.unlock} onPress={onUnlock} />
    </View>
  );
}

/**
 * Cobre o app com a tela de bloqueio ao abrir e ao voltar depois de 1 minuto fora.
 * O conteúdo continua montado (nada se perde), mas fica oculto, inclusive para o TalkBack.
 */
export function AppLock({ children }: { children: ReactNode }) {
  const { settings } = useSecurity();
  const [locked, setLocked] = useState<boolean | null>(null);
  const backgroundAt = useRef<number | null>(null);
  const lockOn = settings?.lock ?? false;

  // Abertura do app: com trava, começa bloqueado.
  if (settings && locked === null) setLocked(settings.lock);

  const unlock = useCallback(() => {
    authenticate()
      .then((ok) => {
        if (ok) setLocked(false);
      })
      .catch((e: unknown) => log.error('unlock_failed', e));
  }, []);

  // Ao bloquear, já abre o pedido de credencial.
  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'background') backgroundAt.current = isLockSuppressed() ? null : Date.now();
      if (status === 'active') {
        if (lockOn && shouldLockOnReturn(backgroundAt.current, Date.now())) setLocked(true);
        backgroundAt.current = null;
      }
    });
    return () => sub.remove();
  }, [lockOn]);

  const hide = settings?.hideRecents ?? false;
  useEffect(() => {
    const apply = hide ? ScreenCapture.preventScreenCaptureAsync(CAPTURE_KEY) : ScreenCapture.allowScreenCaptureAsync(CAPTURE_KEY);
    apply.catch((e: unknown) => log.error('screen_capture_failed', e));
  }, [hide]);

  if (locked === null) return null;
  return (
    <>
      <View
        style={{ flex: 1, display: locked ? 'none' : 'flex' }}
        accessibilityElementsHidden={locked}
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {locked ? <LockScreen onUnlock={unlock} /> : null}
    </>
  );
}
