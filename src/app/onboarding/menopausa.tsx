import { router } from 'expo-router';

import { FinalPeriodField } from '@/components/fields/final-period-field';
import { OnboardingStep } from '@/components/onboarding-step';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.finalPeriod;

export default function FinalPeriodScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = nextRoute('final_period', draft.mode);
  const goNext = () => next && router.push(next);

  return (
    <OnboardingStep
      step="final_period"
      title={copy.title}
      why={copy.why}
      onPrimary={goNext}
      primaryDisabled={!draft.finalPeriod}
      secondary={{
        label: copy.dontRemember,
        onPress: () => {
          update({ finalPeriod: null });
          goNext();
        },
      }}>
      <FinalPeriodField clearable={false} value={draft.finalPeriod} onChange={(finalPeriod) => update({ finalPeriod })} />
    </OnboardingStep>
  );
}
