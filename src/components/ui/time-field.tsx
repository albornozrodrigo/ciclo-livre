import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onChange: (time: string) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Horário HH:MM com o relógio nativo do Android (24h). */
export function TimeField({ label, value, accessibilityLabel, accessibilityHint, onChange }: Props) {
  function open() {
    const initial = new Date();
    initial.setHours(Number(value.slice(0, 2)), Number(value.slice(3, 5)), 0, 0);
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'time',
      is24Hour: true,
      // onValueChange só dispara ao confirmar (o onChange antigo foi descontinuado).
      onValueChange: (_event, date) => onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`),
    });
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={open}
        className="min-h-14 justify-center self-start rounded-full border-[1.5px] border-ink px-6 active:opacity-70 dark:border-ink-night">
        <Text className="text-xl font-bold text-ink [font-variant:tabular-nums] dark:text-ink-night">{value}</Text>
      </Pressable>
    </View>
  );
}
