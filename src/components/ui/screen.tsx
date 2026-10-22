import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Territory } from '@/constants/theme';
import { ptBR, type ScreenKey } from '@/i18n/pt-BR';

import { Lobe, type LobeShape, useLobeHeight } from './lobe';

type Props = {
  screen: ScreenKey;
  territory: Territory;
  shape?: LobeShape;
};

/** Tela de aba: um território dominante com o nome dentro, e o conteúdo sobre a água. */
export function Screen({ screen, territory, shape = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const lobeHeight = useLobeHeight();
  const copy = ptBR.screens[screen];

  return (
    <View className="flex-1 bg-water dark:bg-water-night">
      <Lobe territory={territory} shape={shape} />

      <View style={{ paddingTop: insets.top + 56, minHeight: lobeHeight }} className="px-5">
        <Text
          accessibilityRole="header"
          className="text-[44px] font-bold leading-[42px] tracking-[-1.76px] text-ink">
          {copy.title}
        </Text>
      </View>

      <View className="gap-3 px-5 pt-8">
        <View className="self-start rounded-full bg-sun px-3.5 py-1.5 dark:bg-sun-night">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink">{copy.phase}</Text>
        </View>
        <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{copy.lead}</Text>
      </View>
    </View>
  );
}
