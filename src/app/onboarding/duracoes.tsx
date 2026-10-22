import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ChoiceList } from '@/components/ui/choice-list';
import { NumberStepper } from '@/components/ui/number-stepper';
import { LIMITS, REGULARITIES } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.lengths;
const regularityOptions = REGULARITIES.map((value) => ({ value, label: copy.regularityOptions[value] }));

export default function LengthsScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = nextRoute('lengths', draft.mode);
  const invalid = draft.periodLength >= draft.cycleLength;

  return (
    <OnboardingStep step="lengths" title={copy.title} why={copy.why} onPrimary={() => next && router.push(next)} primaryDisabled={invalid}>
      <View className="gap-6">
        <NumberStepper
          label={copy.period}
          value={draft.periodLength}
          min={LIMITS.periodLength.min}
          max={LIMITS.periodLength.max}
          onChange={(periodLength) => update({ periodLength })}
          format={copy.days}
          decreaseLabel={`${copy.decrease}: ${copy.period}`}
          increaseLabel={`${copy.increase}: ${copy.period}`}
        />
        <NumberStepper
          label={copy.cycle}
          value={draft.cycleLength}
          min={LIMITS.cycleLength.min}
          max={LIMITS.cycleLength.max}
          onChange={(cycleLength) => update({ cycleLength })}
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
          <ChoiceList label={copy.regularity} options={regularityOptions} value={draft.regularity} onChange={(regularity) => update({ regularity })} />
        </View>
      </View>
    </OnboardingStep>
  );
}
