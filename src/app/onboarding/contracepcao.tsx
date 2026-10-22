import { router } from 'expo-router';

import { OnboardingStep } from '@/components/onboarding-step';
import { ChoiceList } from '@/components/ui/choice-list';
import { BIRTH_CONTROL } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.birthControl;
const options = BIRTH_CONTROL.map((value) => ({ value, label: copy.options[value] }));

export default function BirthControlScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = nextRoute('birth_control', draft.mode);
  const goNext = () => next && router.push(next);

  return (
    <OnboardingStep
      step="birth_control"
      title={copy.title}
      why={copy.why}
      onPrimary={goNext}
      primaryDisabled={!draft.birthControl}
      secondary={{
        label: copy.skip,
        onPress: () => {
          update({ birthControl: null });
          goNext();
        },
      }}>
      <ChoiceList label={copy.title} options={options} value={draft.birthControl} onChange={(birthControl) => update({ birthControl })} />
    </OnboardingStep>
  );
}
