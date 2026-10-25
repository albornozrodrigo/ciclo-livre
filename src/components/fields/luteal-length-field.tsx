import { Text, View } from 'react-native';

import { SwitchRow } from '@/components/reminders/switch-row';
import { NumberStepper } from '@/components/ui/number-stepper';
import { LIMITS } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const copy = ptBR.profile.luteal;
const days = ptBR.onboarding.lengths.days;

/** Fase lútea opcional: desligado = null (o motor usa a medida pela temperatura ou 14 dias). */
export function LutealLengthField({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <View className="gap-3">
      <SwitchRow
        label={copy.toggle}
        detail={copy.detail}
        value={value !== null}
        onValueChange={(on) => onChange(on ? LIMITS.lutealLength.default : null)}
      />
      {value !== null ? (
        <NumberStepper
          label={copy.label}
          value={value}
          min={LIMITS.lutealLength.min}
          max={LIMITS.lutealLength.max}
          onChange={onChange}
          format={days}
          decreaseLabel={`${ptBR.onboarding.lengths.decrease}: ${copy.label}`}
          increaseLabel={`${ptBR.onboarding.lengths.increase}: ${copy.label}`}
        />
      ) : null}
      {value !== null ? <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{copy.measuredWins}</Text> : null}
    </View>
  );
}
