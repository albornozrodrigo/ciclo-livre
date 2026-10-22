import { Pressable, Text, View } from 'react-native';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
};

/** − valor + com semântica "adjustable": TalkBack ajusta deslizando para cima/baixo. */
export function NumberStepper({ label, value, min, max, onChange, format, decreaseLabel, increaseLabel }: Props) {
  const change = (delta: number) => {
    const next = value + delta;
    if (next >= min && next <= max) onChange(next);
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      <View className="min-h-14 flex-row items-center justify-between rounded-full border-[1.5px] border-ink px-1.5 dark:border-ink-night">
        <StepButton symbol="−" label={decreaseLabel} disabled={value <= min} onPress={() => change(-1)} />
        {/* O valor é o elemento ajustável; os botões continuam focáveis à parte. */}
        <Text
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: format(value) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => change(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          className="flex-1 text-center text-xl font-bold text-ink [font-variant:tabular-nums] dark:text-ink-night">
          {format(value)}
        </Text>
        <StepButton symbol="+" label={increaseLabel} disabled={value >= max} onPress={() => change(1)} />
      </View>
    </View>
  );
}

function StepButton({ symbol, label, disabled, onPress }: { symbol: string; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      className="h-11 w-11 items-center justify-center rounded-full bg-ink active:opacity-80 disabled:opacity-30 dark:bg-ink-night">
      <Text className="text-2xl font-bold leading-7 text-water dark:text-water-night">{symbol}</Text>
    </Pressable>
  );
}
