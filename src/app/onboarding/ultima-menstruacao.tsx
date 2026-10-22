import { router } from 'expo-router';

import { OnboardingStep } from '@/components/onboarding-step';
import { DateField } from '@/components/ui/date-field';
import { addDays, todayIso } from '@/domain/dates';
import { LIMITS } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.lastPeriod;

export default function LastPeriodScreen() {
  const { draft, update } = useOnboardingDraft();
  const today = todayIso();
  const next = nextRoute('last_period', draft.mode);
  const goNext = () => next && router.push(next);

  return (
    <OnboardingStep
      step="last_period"
      title={copy.title}
      why={copy.why}
      onPrimary={goNext}
      primaryDisabled={!draft.lastPeriodStart}
      secondary={{
        label: copy.dontRemember,
        onPress: () => {
          update({ lastPeriodStart: null });
          goNext();
        },
      }}>
      <DateField
        label={copy.label}
        value={draft.lastPeriodStart}
        placeholder={copy.pick}
        min={addDays(today, -LIMITS.lastPeriodMaxDaysAgo)}
        max={today}
        initial={today}
        onChange={(lastPeriodStart) => update({ lastPeriodStart })}
      />
    </OnboardingStep>
  );
}
