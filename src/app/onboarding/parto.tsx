import { router } from 'expo-router';

import { BabyBirthField } from '@/components/fields/baby-birth-field';
import { OnboardingStep } from '@/components/onboarding-step';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.babyBirth;

export default function BabyBirthScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = nextRoute('baby_birth', draft.mode);

  return (
    <OnboardingStep
      step="baby_birth"
      title={copy.title}
      why={copy.why}
      onPrimary={() => next && router.push(next)}
      primaryDisabled={!draft.babyBirth}>
      <BabyBirthField value={draft.babyBirth} onChange={(babyBirth) => update({ babyBirth })} />
    </OnboardingStep>
  );
}
