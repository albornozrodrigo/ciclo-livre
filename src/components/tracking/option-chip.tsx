import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  /** Nome para o TalkBack com o contexto da categoria ("Menstruação: Leve"). */
  accessibilityLabel: string;
  selected: boolean;
  /** single = rádio (uma por categoria); multi = caixa de seleção. */
  kind: 'single' | 'multi';
  onPress: () => void;
};

/** Chip de opção do registro: contorno; selecionado em tinta cheia (nunca cor de fase). */
export function OptionChip({ label, accessibilityLabel, selected, kind, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole={kind === 'single' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={
        selected
          ? 'min-h-12 justify-center rounded-full border-[1.5px] border-ink bg-ink px-4 dark:border-ink-night dark:bg-ink-night'
          : 'min-h-12 justify-center rounded-full border-[1.5px] border-ink px-4 active:opacity-70 dark:border-ink-night'
      }>
      <Text
        className={
          selected
            ? 'text-sm font-bold tracking-[0.28px] text-water dark:text-water-night'
            : 'text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night'
        }>
        {label}
      </Text>
    </Pressable>
  );
}
