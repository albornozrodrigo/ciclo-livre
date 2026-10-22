import { router } from 'expo-router';
import { Text } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { ChoiceList } from '@/components/ui/choice-list';
import { MODES } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.mode;
const options = MODES.map((mode) => ({ value: mode, label: copy.options[mode].label, detail: copy.options[mode].detail }));

export default function ModeScreen() {
  const { draft, update } = useOnboardingDraft();
  const next = draft.mode ? nextRoute('mode', draft.mode) : null;

  return (
    <OnboardingStep step="mode" title={copy.title} onPrimary={() => next && router.push(next)} primaryDisabled={!next}>
      <ChoiceList label={copy.title} options={options} value={draft.mode} onChange={(mode) => update({ mode })} />
      <Text className="mt-4 text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{copy.hint}</Text>
    </OnboardingStep>
  );
}
