import { View } from 'react-native';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { DateField } from '@/components/ui/date-field';
import { type IsoDate, todayIso } from '@/domain/dates';
import { finalPeriodOldest } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const copy = ptBR.onboarding.finalPeriod;

type Props = {
  value: IsoDate | null;
  onChange: (value: IsoDate | null) => void;
  /** Mostra "Não lembro" para limpar a data (o onboarding tem o próprio botão). */
  clearable?: boolean;
};

/** Menopausa: data aproximada da última menstruação, de hoje até 50 anos atrás. Opcional. */
export function FinalPeriodField({ value, onChange, clearable = true }: Props) {
  const today = todayIso();
  return (
    <View className="gap-3">
      <DateField
        label={copy.label}
        value={value}
        placeholder={copy.pick}
        min={finalPeriodOldest(today)}
        max={today}
        initial={today}
        onChange={onChange}
      />
      {clearable && value ? <CapsuleButton variant="outline" label={copy.dontRemember} onPress={() => onChange(null)} /> : null}
    </View>
  );
}
