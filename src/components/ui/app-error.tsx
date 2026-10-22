import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

type Props = {
  /** Recebido do ErrorBoundary; nunca mostrado (pode conter caminhos e detalhes internos). */
  error: Error;
  retry: () => void;
  /** Apaga banco e chave; saída quando "tentar de novo" não resolve. */
  reset: () => Promise<void>;
  /** Pede confirmação explícita; resolve true só se a pessoa confirmar. */
  confirmReset: () => Promise<boolean>;
};

const copy = ptBR.appError;

/** Tela de erro geral: mensagem acolhedora, sem detalhes técnicos, com tentar de novo e recomeçar. */
export function AppError({ retry, reset, confirmReset }: Props) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  // Trava síncrona: dois toques seguidos chegam antes de o estado `busy` atualizar.
  const inProgress = useRef(false);

  async function handleResetPress() {
    if (inProgress.current) return;
    inProgress.current = true;
    setBusy(true);
    try {
      if (!(await confirmReset())) return;
      await reset();
      retry();
    } catch (resetError) {
      log.error('reset_after_open_failure_failed', resetError);
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  }

  return (
    <View
      style={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }}
      className="flex-1 justify-between bg-water px-5 dark:bg-water-night">
      {/* Sem lobo atrás da barra de status nesta tela: os ícones seguem o tema. */}
      <StatusBar style="auto" />
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {copy.title}
        </Text>
        <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{copy.body}</Text>
      </View>

      <View className="gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          className="min-h-12 items-center justify-center rounded-full bg-sun px-5 active:opacity-80 dark:bg-sun-night">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink">{copy.retry}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={copy.resetHint}
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={handleResetPress}
          className="min-h-12 items-center justify-center rounded-full border-[1.5px] border-ink px-5 active:opacity-70 dark:border-ink-night">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.reset}</Text>
        </Pressable>
      </View>
    </View>
  );
}
