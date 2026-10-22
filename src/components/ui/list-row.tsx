import { Pressable, Text, useColorScheme, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';

type Props = {
  label: string;
  /** Valor atual ou explicação curta, em tinta suave abaixo do rótulo. */
  detail?: string;
  onPress: () => void;
};

/** Linha de navegação: rótulo, detalhe e seta. Nome acessível inclui o detalhe. */
export function ListRow({ label, detail, onPress }: Props) {
  const ink = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'].ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 border-b border-line py-3 active:opacity-70 dark:border-line-night">
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-bold text-ink dark:text-ink-night">{label}</Text>
        {detail ? <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{detail}</Text> : null}
      </View>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M9 5l7 7-7 7" stroke={ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressable>
  );
}
