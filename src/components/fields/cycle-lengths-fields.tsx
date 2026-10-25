import { Text, View } from 'react-native';

import { ChoiceList } from '@/components/ui/choice-list';
import { NumberStepper } from '@/components/ui/number-stepper';
import { LIMITS, type Profile, REGULARITIES } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const copy = ptBR.onboarding.lengths;
const regularityOptions = REGULARITIES.map((value) => ({ value, label: copy.regularityOptions[value] }));

type Values = Pick<Profile, 'periodLength' | 'cycleLength' | 'regularity'>;

/** Durações da menstruação e do ciclo + regularidade (onboarding e edição de perfil). */
export function CycleLengthsFields({ value, onChange }: { value: Values; onChange: (patch: Partial<Values>) => void }) {
  const invalid = value.periodLength >= value.cycleLength;
  return (
    <View className="gap-6">
      <NumberStepper
        label={copy.period}
        value={value.periodLength}
        min={LIMITS.periodLength.min}
        max={LIMITS.periodLength.max}
        onChange={(periodLength) => onChange({ periodLength })}
        format={copy.days}
        decreaseLabel={`${copy.decrease}: ${copy.period}`}
        increaseLabel={`${copy.increase}: ${copy.period}`}
      />
      <NumberStepper
        label={copy.cycle}
        value={value.cycleLength}
        min={LIMITS.cycleLength.min}
        max={LIMITS.cycleLength.max}
        onChange={(cycleLength) => onChange({ cycleLength })}
        format={copy.days}
        decreaseLabel={`${copy.decrease}: ${copy.cycle}`}
        increaseLabel={`${copy.increase}: ${copy.cycle}`}
      />
      {invalid ? (
        <Text accessibilityLiveRegion="polite" className="text-base leading-6 text-ink dark:text-ink-night">
          {copy.errors.not_shorter_than_cycle}
        </Text>
      ) : null}
      <View className="gap-3">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.regularity}</Text>
        <ChoiceList label={copy.regularity} options={regularityOptions} value={value.regularity} onChange={(regularity) => onChange({ regularity })} />
      </View>
    </View>
  );
}
