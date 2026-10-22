import { router } from 'expo-router';

import { CycleLengthsFields } from '@/components/fields/cycle-lengths-fields';
import { OnboardingStep } from '@/components/onboarding-step';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.lengths;

export default function LengthsScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = nextRoute('lengths', draft.mode);

  return (
    <OnboardingStep
      step="lengths"
      title={copy.title}
      why={copy.why}
      onPrimary={() => next && router.push(next)}
      primaryDisabled={draft.periodLength >= draft.cycleLength}>
      <CycleLengthsFields value={draft} onChange={update} />
    </OnboardingStep>
  );
}
