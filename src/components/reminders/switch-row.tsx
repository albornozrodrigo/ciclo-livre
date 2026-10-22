import { Pressable, Switch, Text, useColorScheme, View } from 'react-native';

import { Palette } from '@/constants/theme';

type Props = {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Toque no texto abre o detalhe; o interruptor é um controle à parte. */
  onPress?: () => void;
};

/** Linha com interruptor (≥64dp): rótulo e detalhe à esquerda, switch acessível à direita. */
export function SwitchRow({ label, detail, value, onValueChange, onPress }: Props) {
  const p = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const text = (
    <View className="flex-1 gap-0.5">
      <Text className="text-base font-bold text-ink dark:text-ink-night">{label}</Text>
      {detail ? <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{detail}</Text> : null}
    </View>
  );
  return (
    <View className="min-h-16 flex-row items-center gap-3 border-b border-line py-2 dark:border-line-night">
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={detail ? `${label}. ${detail}` : label}
          onPress={onPress}
          className="min-h-12 flex-1 justify-center active:opacity-70">
          {text}
        </Pressable>
      ) : (
        text
      )}
      {/* Cores do mundo com contraste ≥ 3:1 (WCAG 1.4.11): ligado = trilho de tinta e botão de sol. */}
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: p.inkMuted, true: p.ink }}
        thumbColor={value ? p.sun : p.water}
        ios_backgroundColor={p.inkMuted}
      />
    </View>
  );
}
