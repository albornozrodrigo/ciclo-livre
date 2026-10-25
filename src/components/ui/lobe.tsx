import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, useColorScheme, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Palette, type Territory } from '@/constants/theme';

/** Contornos orgânicos desenhados à mão (viewBox 0 0 400 400). */
const SHAPES = [
  'M312 18C378 52 404 140 382 214C362 282 392 338 344 380C290 428 196 398 134 372C66 344 8 300 14 220C20 146 70 112 112 66C160 14 246 -16 312 18Z',
  'M58 40C130 -6 240 10 316 52C392 94 410 178 372 246C338 308 360 372 288 392C206 414 120 380 66 326C10 270 -14 186 12 122C26 88 30 58 58 40Z',
  'M200 8C284 4 380 60 392 150C402 226 340 262 350 330C360 398 270 410 200 388C124 364 30 380 10 300C-8 228 52 196 46 128C40 58 120 12 200 8Z',
] as const;

/** Fração da largura da tela que o lobo ocupa, e quanto ele sangra para fora do quadro. */
const SCALE = 1.3;
/** Movimento do mundo (DESIGN.md): 0,4s na troca de território, com leve overshoot no lobo ao chegar na tela. */
const COLOR_MS = 400;
const ARRIVE = { friction: 6, tension: 90 } as const;
const BLEED_LEFT = 0.15;
const BLEED_TOP = 0.45;

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type LobeShape = 0 | 1 | 2;

/** Altura visível do lobo (abaixo do topo da tela), usada para posicionar o conteúdo. */
export function useLobeHeight() {
  const { width } = useWindowDimensions();
  return width * SCALE * (1 - BLEED_TOP);
}

/**
 * Território dominante da tela: cor chapada que sai do quadro pelo topo e pelas laterais.
 * É decorativo; o significado sempre vem do texto sobre ele.
 */
/** "Remover animações" do sistema: com ele ligado, as trocas são secas. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => active && setReduce(on));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function Lobe({ territory, shape = 0 }: { territory: Territory; shape?: LobeShape }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { width } = useWindowDimensions();
  const size = width * SCALE;
  const color = Palette[scheme][territory];
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();

  // Troca de território (ex.: a fase de hoje mudou): a cor desliza da anterior para a nova.
  const [colors, setColors] = useState({ from: color, to: color });
  const [progress] = useState(() => new Animated.Value(1));
  if (colors.to !== color) setColors({ from: colors.to, to: color });
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: COLOR_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [colors, progress, reduceMotion]);
  const fill = progress.interpolate({ inputRange: [0, 1], outputRange: [colors.from, colors.to] });

  // Ao chegar na aba, o lobo assenta com um leve overshoot vindo do canto de onde sangra.
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!focused || reduceMotion) return;
    scale.setValue(0.94);
    Animated.spring(scale, { toValue: 1, ...ARRIVE, useNativeDriver: true }).start();
  }, [focused, reduceMotion, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="lobe"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: -width * BLEED_LEFT,
        top: -size * BLEED_TOP,
        transformOrigin: 'top left',
        transform: [{ scale }],
      }}>
      <Svg width={size} height={size} viewBox="0 0 400 400">
        <AnimatedPath d={SHAPES[shape]} fill={fill} />
      </Svg>
    </Animated.View>
  );
}

/** Lobo menor, à direita e por baixo do dominante: o território que vem depois (Hoje: a próxima fase). */
export function SideLobe({ territory, top }: { territory: Territory; top: number }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { width } = useWindowDimensions();
  const size = width * SIDE_SCALE;
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="lobe-next"
      style={{ position: 'absolute', width: size, height: size, right: -size * SIDE_BLEED_RIGHT, top }}>
      <Svg width={size} height={size} viewBox="0 0 400 400">
        <Path d={SHAPES[1]} fill={Palette[scheme][territory]} />
      </Svg>
    </Animated.View>
  );
}

/** Tamanho do lobo secundário e quanto ele sai pela direita; a etiqueta fica sobre a parte visível. */
export const SIDE_SCALE = 0.56;
export const SIDE_BLEED_RIGHT = 0.3;

/** Lobo sem movimento nem foco de navegação (para telas fora do navegador, como a de bloqueio). */
export function StaticLobe({ territory, shape = 0 }: { territory: Territory; shape?: LobeShape }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { width } = useWindowDimensions();
  const size = width * SCALE;
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="lobe"
      style={{ position: 'absolute', width: size, height: size, left: -width * BLEED_LEFT, top: -size * BLEED_TOP }}>
      <Svg width={size} height={size} viewBox="0 0 400 400">
        <Path d={SHAPES[shape]} fill={Palette[scheme][territory]} />
      </Svg>
    </Animated.View>
  );
}
