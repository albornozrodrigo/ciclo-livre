import { router } from 'expo-router';

import { OnboardingStep } from '@/components/onboarding-step';
import { ChoiceList } from '@/components/ui/choice-list';
import { TRYING_SINCE } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.tryingSince;
const options = TRYING_SINCE.map((value) => ({ value, label: copy.options[value] }));

export default function TryingSinceScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = nextRoute('trying_since', draft.mode);

  return (
    <OnboardingStep step="trying_since" title={copy.title} onPrimary={() => next && router.push(next)} primaryDisabled={!draft.tryingSince}>
      <ChoiceList label={copy.title} options={options} value={draft.tryingSince} onChange={(tryingSince) => update({ tryingSince })} />
    </OnboardingStep>
  );
}
