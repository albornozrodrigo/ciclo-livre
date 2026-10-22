import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ptBR } from '@/i18n/pt-BR';

type Props = {
  /** Apaga e avisa o resultado (a tela é remontada depois, então o aviso fica com quem chama). */
  onErase: () => Promise<void>;
  /** Pede confirmação explícita; resolve true só se a pessoa confirmar. */
  confirm: () => Promise<boolean>;
};

const copy = ptBR.privacy;

export function PrivacySection({ onErase, confirm }: Props) {
  // Ocupado desde o toque até o fim do erase: evita dois diálogos e dois erases com toque duplo.
  const [busy, setBusy] = useState(false);
  // Trava síncrona: dois toques seguidos chegam antes de o estado `busy` atualizar.
  const inProgress = useRef(false);

  async function handleErasePress() {
    if (inProgress.current) return;
    inProgress.current = true;
    setBusy(true);
    try {
      if (await confirm()) await onErase();
    } finally {
      inProgress.current = false;
      setBusy(false);
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
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={handleErasePress}
          className="min-h-12 items-center justify-center self-start rounded-full border-[1.5px] border-ink px-5 active:opacity-70 dark:border-ink-night">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.eraseButton}</Text>
        </Pressable>
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{copy.eraseHint}</Text>
      </View>
    </View>
  );
}
