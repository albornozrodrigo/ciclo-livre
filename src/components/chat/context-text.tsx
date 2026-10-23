import { Text, View } from 'react-native';

import { ptBR } from '@/i18n/pt-BR';

const c = ptBR.chat;

/** O texto exato que vai ao Claude, em quadro de contorno, com contagem de caracteres. */
export function ContextText({ text }: { text: string | null }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {c.exactTitle}
      </Text>
      {text === null ? (
        <Text accessibilityLiveRegion="polite" className="text-base text-ink-muted dark:text-ink-muted-night">
          {c.building}
        </Text>
      ) : (
        <>
          <View className="rounded-[28px] border-[1.5px] border-ink p-5 dark:border-ink-night">
            {/* Corpo de leitura (16/24): é o texto que a pessoa precisa entender para consentir. */}
            <Text selectable style={{ fontVariant: ['tabular-nums'] }} className="text-base leading-6 text-ink dark:text-ink-night">
              {text}
            </Text>
          </View>
          <Text style={{ fontVariant: ['tabular-nums'] }} className="text-sm text-ink-muted dark:text-ink-muted-night">
            {c.chars(text.length)}
          </Text>
        </>
      )}
    </View>
  );
}
