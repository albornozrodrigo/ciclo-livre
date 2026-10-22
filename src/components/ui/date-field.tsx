import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, Text, View } from 'react-native';

import { dateFromIso, type IsoDate, isoFromDate } from '@/domain/dates';

type Props = {
  label: string;
  value: IsoDate | null;
  /** Texto do botão quando ainda não há data. */
  placeholder: string;
  min: IsoDate;
  max: IsoDate;
  /** Data em que o calendário abre quando ainda não há valor. */
  initial: IsoDate;
  onChange: (value: IsoDate) => void;
};

export function formatLongDate(value: IsoDate): string {
  return dateFromIso(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Campo de data que abre o seletor nativo do Android, já limitado às datas aceitas. */
export function DateField({ label, value, placeholder, min, max, initial, onChange }: Props) {
  function open() {
    DateTimePickerAndroid.open({
      value: dateFromIso(value ?? initial),
      mode: 'date',
      // Seletor padrão do Android: o "material" (MaterialDatePicker) exige tema Material Components
      // e derruba o app com o tema AppCompat gerado pelo Expo.
      minimumDate: dateFromIso(min),
      maximumDate: dateFromIso(max),
      // Só dispara ao confirmar; cancelar não muda nada.
      onValueChange: (_event, date) => onChange(isoFromDate(date)),
    });
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatLongDate(value) : placeholder}`}
        onPress={open}
        className="min-h-16 justify-center rounded-[28px] border-[1.5px] border-ink px-6 active:opacity-70 dark:border-ink-night">
        <Text className={value ? 'text-xl font-bold text-ink dark:text-ink-night' : 'text-xl font-bold text-ink-muted dark:text-ink-muted-night'}>
          {value ? formatLongDate(value) : placeholder}
        </Text>
      </Pressable>
    </View>
  );
}
