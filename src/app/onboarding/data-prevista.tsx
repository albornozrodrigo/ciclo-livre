import { router } from 'expo-router';

import { OnboardingStep } from '@/components/onboarding-step';
import { DateField } from '@/components/ui/date-field';
import { addDays, isoFromDate } from '@/domain/dates';
import { LIMITS } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.dueDate;

export default function DueDateScreen() {
  const { draft, update } = useOnboardingDraft();
  const today = isoFromDate(new Date());
  const next = nextRoute('due_date', draft.mode);

  return (
    <OnboardingStep
      step="due_date"
      title={copy.title}
      why={copy.why}
      onPrimary={() => next && router.push(next)}
      primaryDisabled={!draft.dueDate}>
      <DateField
        label={copy.label}
        value={draft.dueDate}
        placeholder={copy.pick}
        min={today}
        max={addDays(today, LIMITS.dueDateMaxDaysAhead)}
        initial={addDays(today, 140)}
        onChange={(dueDate) => update({ dueDate })}
      />
    </OnboardingStep>
  );
}
