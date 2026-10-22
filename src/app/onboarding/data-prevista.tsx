import { router } from 'expo-router';

import { DueDateField } from '@/components/fields/due-date-field';
import { OnboardingStep } from '@/components/onboarding-step';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.dueDate;

export default function DueDateScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = nextRoute('due_date', draft.mode);

  return (
    <OnboardingStep step="due_date" title={copy.title} why={copy.why} onPrimary={() => next && router.push(next)} primaryDisabled={!draft.dueDate}>
      <DueDateField value={draft.dueDate} onChange={(dueDate) => update({ dueDate })} />
    </OnboardingStep>
  );
}
