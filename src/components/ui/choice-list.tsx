import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Palette } from '@/constants/theme';

export type Choice<T extends string> = { value: T; label: string; detail?: string };

type Props<T extends string> = {
  /** Nome do grupo para leitores de tela (a pergunta da tela). */
  label: string;
  options: readonly Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

/** Lista de escolha única. Selecionada = tinta cheia (inverte), nunca cor de fase. */
export function ChoiceList<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="gap-2.5">
      {options.map((option) => (
        <ChoiceRow key={option.value} option={option} selected={option.value === value} onPress={() => onChange(option.value)} />
      ))}
    </View>
  );
}

function ChoiceRow<T extends string>({ option, selected, onPress }: { option: Choice<T>; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={option.detail ? `${option.label}. ${option.detail}` : option.label}
      onPress={onPress}
      className={
        selected
          ? 'min-h-14 flex-row items-center gap-3 rounded-[28px] border-[1.5px] border-ink bg-ink px-5 py-3 dark:border-ink-night dark:bg-ink-night'
          : 'min-h-14 flex-row items-center gap-3 rounded-[28px] border-[1.5px] border-ink px-5 py-3 active:opacity-70 dark:border-ink-night'
      }>
      <View className="flex-1 gap-0.5">
        <Text
          className={
            selected ? 'text-base font-bold text-water dark:text-water-night' : 'text-base font-bold text-ink dark:text-ink-night'
          }>
          {option.label}
        </Text>
        {option.detail ? (
          <Text
            className={
              selected ? 'text-sm leading-5 text-water dark:text-water-night' : 'text-sm leading-5 text-ink-muted dark:text-ink-muted-night'
            }>
            {option.detail}
          </Text>
        ) : null}
      </View>
      {selected ? <Check /> : null}
    </Pressable>
  );
}

/** Marca de selecionado (sol com visto de tinta), também usada nas prévias de ícone. */
export function Check() {
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full bg-sun">
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke={Palette.light.ink}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
