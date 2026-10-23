import { Pressable, Text, View } from 'react-native';

type Props = { text: string; actionLabel: string; onAction: () => void };

/** Aviso de atenção (DESIGN.md): contorno de 3dp, texto 700 e uma ação em tinta cheia, em região "polite". */
export function AttentionNotice({ text, actionLabel, onAction }: Props) {
  return (
    <View accessibilityLiveRegion="polite" className="gap-3 rounded-[28px] border-[3px] border-ink p-5 dark:border-ink-night">
      <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{`Erro: ${text}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        className="min-h-12 justify-center self-start rounded-full bg-ink px-5 active:opacity-70 dark:bg-ink-night">
        <Text className="text-sm font-bold tracking-[0.28px] text-water dark:text-water-night">{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
