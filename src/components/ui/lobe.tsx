import { useColorScheme, useWindowDimensions, View } from 'react-native';
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
const BLEED_LEFT = 0.15;
const BLEED_TOP = 0.45;

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
export function Lobe({ territory, shape = 0 }: { territory: Territory; shape?: LobeShape }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { width } = useWindowDimensions();
  const size = width * SCALE;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="lobe"
      style={{ position: 'absolute', width: size, height: size, left: -width * BLEED_LEFT, top: -size * BLEED_TOP }}>
      <Svg width={size} height={size} viewBox="0 0 400 400">
        <Path d={SHAPES[shape]} fill={Palette[scheme][territory]} />
      </Svg>
    </View>
  );
}
