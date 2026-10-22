import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

type Props = {
  onErase: () => Promise<void>;
  /** Pede confirmação explícita; resolve true só se a pessoa confirmar. */
  confirm: () => Promise<boolean>;
};

type Status = 'idle' | 'erasing' | 'erased' | 'failed';

const copy = ptBR.privacy;

export function PrivacySection({ onErase, confirm }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  async function handleErasePress() {
    if (!(await confirm())) return;
    setStatus('erasing');
    try {
      await onErase();
      setStatus('erased');
    } catch (error) {
      log.error('erase_all_failed', error);
      setStatus('failed');
    }
  }

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {copy.title}
      </Text>
      <Text className="text-base leading-6 text-ink dark:text-ink-night">{copy.localData}</Text>
      <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{copy.medicalDisclaimer}</Text>

      <View className="gap-2 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityHint={copy.eraseHint}
          accessibilityState={{ busy: status === 'erasing', disabled: status === 'erasing' }}
          disabled={status === 'erasing'}
          onPress={handleErasePress}
          className="min-h-12 items-center justify-center self-start rounded-full border-[1.5px] border-ink px-5 active:opacity-70 dark:border-ink-night">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.eraseButton}</Text>
        </Pressable>
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{copy.eraseHint}</Text>
        {status === 'erased' || status === 'failed' ? (
          <Text accessibilityLiveRegion="polite" className="text-sm font-bold leading-5 text-ink dark:text-ink-night">
            {status === 'erased' ? copy.erased : copy.eraseFailed}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
