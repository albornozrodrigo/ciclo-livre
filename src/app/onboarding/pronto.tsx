import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { todayIso } from '@/domain/dates';
import type { Step } from '@/domain/onboarding';
import { validateProfile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { useOnboardingDraft } from '@/onboarding/draft';
import { STEP_ROUTES } from '@/onboarding/routes';
import { fixStepFor, toProfileInput } from '@/onboarding/to-profile-input';
import { useProfile } from '@/profile/profile-context';

const copy = ptBR.onboarding.done;

export default function DoneScreen() {
  const { draft } = useOnboardingDraft();
  const { saveProfile } = useProfile();
  const [fixStep, setFixStep] = useState<Step | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  async function handleStart() {
    const input = toProfileInput(draft);
    const result = validateProfile(input, todayIso());
    if (!result.ok) return setFixStep(fixStepFor(result.errors[0].field, input.mode));
    setSaving(true);
    setSaveFailed(false);
    try {
      // Ao salvar, a guarda de rotas troca o onboarding pelas abas.
      await saveProfile(result.profile);
    } catch (error) {
      log.error('onboarding_save_failed', error);
      setSaveFailed(true);
      setSaving(false);
    }
  }

  return (
    <OnboardingStep step="done" title={copy.title} primaryLabel={copy.start} onPrimary={handleStart} primaryDisabled={saving}>
      <View className="gap-4">
        <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{copy.lead}</Text>
        <View className="rounded-[28px] border-[1.5px] border-ink p-5 dark:border-ink-night">
          <Text className="text-lg font-bold leading-7 text-ink dark:text-ink-night">{copy.disclaimer}</Text>
        </View>
        {draft.lastPeriodStart === null && draft.mode !== 'pregnancy' && draft.mode !== 'no_bleeding' && draft.mode !== 'postpartum' ? (
          <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">
            {ptBR.onboarding.lastPeriod.dontRememberNote}
          </Text>
        ) : null}
        {saveFailed ? (
          <Text accessibilityLiveRegion="assertive" className="text-base font-bold leading-6 text-ink dark:text-ink-night">
            {copy.saveFailed}
          </Text>
        ) : null}
        {fixStep ? (
          <View accessibilityLiveRegion="assertive" className="gap-3">
            <Text className="text-base leading-6 text-ink dark:text-ink-night">{copy.fixError}</Text>
            <CapsuleButton variant="outline" label={copy.fixButton} onPress={() => router.dismissTo(STEP_ROUTES[fixStep])} />
          </View>
        ) : null}
      </View>
    </OnboardingStep>
  );
}
