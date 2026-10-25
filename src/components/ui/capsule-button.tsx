import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  /** primary = sol com chip de tinta e seta (ação principal); outline = contorno de tinta. */
  variant?: 'primary' | 'outline';
  disabled?: boolean;
  accessibilityHint?: string;
};

/** Cápsula do DESIGN.md: altura mínima de 48dp, rótulo em tinta. */
export function CapsuleButton({ label, onPress, variant = 'primary', disabled = false, accessibilityHint }: Props) {
  // Desabilitada, a primária vira contorno com rótulo suave: sol translúcido fica ilegível no escuro.
  const primary = variant === 'primary' && !disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={
        primary
          ? 'min-h-14 flex-row items-center justify-between rounded-full bg-sun pl-6 pr-2 active:opacity-80 dark:bg-sun-night'
          : disabled
            ? `${variant === 'primary' ? 'min-h-14' : 'min-h-12'} items-center justify-center rounded-full border-[1.5px] border-dashed border-ink-muted px-5 dark:border-ink-muted-night`
            : 'min-h-12 items-center justify-center rounded-full border-[1.5px] border-ink px-5 active:opacity-70 dark:border-ink-night'
      }>
      <Text
        className={
          primary
            ? 'text-base font-bold tracking-[0.32px] text-ink'
            : disabled
              ? `${variant === 'primary' ? 'text-base tracking-[0.32px]' : 'text-sm tracking-[0.28px]'} font-bold text-ink-muted dark:text-ink-muted-night`
              : 'text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night'
        }>
        {label}
      </Text>
      {primary ? <ArrowChip /> : null}
    </Pressable>
  );
}

/** Chip redondo de tinta com seta: a "ponta" da cápsula primária. */
function ArrowChip() {
  return (
    <View testID="capsule-arrow" className="h-10 w-10 items-center justify-center rounded-full bg-ink">
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d="M4 12h14M12 5l7 7-7 7" stroke={Palette.light.sun} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}
