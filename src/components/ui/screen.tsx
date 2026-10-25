import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Territory } from '@/constants/theme';
import { ptBR, type ScreenKey } from '@/i18n/pt-BR';

import { Lobe, type LobeShape, SIDE_BLEED_RIGHT, SIDE_SCALE, SideLobe, useLobeHeight } from './lobe';

type Props = {
  screen: ScreenKey;
  territory: Territory;
  shape?: LobeShape;
  /** Território que vem depois (lobo menor, sobreposto pelo dominante), sempre com o nome escrito. */
  secondary?: { territory: Territory; label: string };
  /** Conteúdo da tela, abaixo do texto de apresentação. */
  children?: ReactNode;
};

/**
 * Barra de status das telas com lobo: ícones escuros sobre o lobo; quando a borda dele passa por baixo
 * da barra, um véu da cor da água e ícones no tema. Só a aba em foco decide.
 */
export function useLobeStatusBar() {
  const insets = useSafeAreaInsets();
  const lobeHeight = useLobeHeight();
  const focused = useIsFocused();
  const [pastLobe, setPastLobe] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // A borda esquerda do lobo sobe antes da parte mais funda: o relógio fica sobre a água antes.
    const past = e.nativeEvent.contentOffset.y > lobeHeight * 0.75 - insets.top;
    if (past !== pastLobe) setPastLobe(past);
  };
  const statusBar = focused ? <StatusBar style={pastLobe ? 'auto' : 'dark'} /> : null;
  const scrim = pastLobe ? (
    <View
      testID="status-scrim"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top }}
      className="bg-water dark:bg-water-night"
    />
  ) : null;
  return { onScroll, statusBar, scrim };
}

/** Topo da tela de aba: o lobo dominante com o nome dentro e o texto de apoio na água. */
export function ScreenHeader({ screen, territory, shape = 0, secondary }: Omit<Props, 'children'>) {
  const insets = useSafeAreaInsets();
  const lobeHeight = useLobeHeight();
  const { width } = useWindowDimensions();
  // O lobo secundário começa um pouco acima da borda do dominante, que o sobrepõe.
  const sideTop = lobeHeight * 0.62;
  const sideSize = width * SIDE_SCALE;
  const copy = ptBR.screens[screen];

  return (
    <>
      {secondary ? <SideLobe territory={secondary.territory} top={sideTop} /> : null}
      <Lobe territory={territory} shape={shape} />

      <View style={{ paddingTop: insets.top + 56, minHeight: lobeHeight }} className="px-5">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-[44px] font-bold leading-[42px] tracking-[-1.76px] text-ink">
          {copy.title}
        </Text>
      </View>

      {secondary ? (
        // Nome escrito sobre a parte visível do lobo secundário (cor de fase sempre com rótulo). Depois do título na árvore:
        // o TalkBack lê "Hoje" antes. Sempre `ink`: o lobo é cor de fase também no escuro.
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={{ position: 'absolute', top: sideTop + sideSize * 0.46, right: 20, width: sideSize * (1 - SIDE_BLEED_RIGHT) - 36 }}
          className="text-right text-sm font-bold leading-5 text-ink">
          {secondary.label}
        </Text>
      ) : null}

      <View className="gap-3 px-5 pt-8">
        {'lead' in copy ? <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{copy.lead}</Text> : null}
      </View>
    </>
  );
}

/** Tela de aba: um território dominante com o nome dentro, e o conteúdo sobre a água. */
export function Screen({ children, ...header }: Props) {
  const insets = useSafeAreaInsets();
  const { onScroll, statusBar, scrim } = useLobeStatusBar();

  return (
    <View className="flex-1 bg-water dark:bg-water-night">
      {statusBar}
      <ScrollView
        testID="screen-scroll"
        onScroll={onScroll}
        scrollEventThrottle={32}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <ScreenHeader {...header} />
        {children ? <View className="px-5 pt-8">{children}</View> : null}
      </ScrollView>
      {scrim}
    </View>
  );
}
