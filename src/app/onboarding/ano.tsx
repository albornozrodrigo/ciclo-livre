import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';

import { OnboardingStep } from '@/components/onboarding-step';
import { todayIso } from '@/domain/dates';
import { validateBirthYear } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { useOnboardingDraft } from '@/onboarding/draft';
import { nextRoute } from '@/onboarding/routes';

const copy = ptBR.onboarding.birthYear;

export default function BirthYearScreen() {
  const { draft, update } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    const code = validateBirthYear(Number(draft.birthYear), todayIso());
    if (code === 'under_18' || code === 'out_of_range') {
      // Fecha o teclado para a mensagem não ficar escondida atrás dele.
      Keyboard.dismiss();
      return setError(copy.errors[code]);
    }
    setError(null);
    router.push(nextRoute('birth_year', draft.mode) ?? '/onboarding/objetivo');
  }

  return (
    <OnboardingStep step="birth_year" title={copy.title} why={copy.why} onPrimary={handleContinue} primaryDisabled={draft.birthYear.length !== 4}>
      <View className="gap-2">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.label}</Text>
        <TextInput
          accessibilityLabel={copy.label}
          accessibilityHint={error ?? undefined}
          value={draft.birthYear}
          onChangeText={(text) => {
            update({ birthYear: text.replace(/\D/g, '').slice(0, 4) });
            setError(null);
          }}
          placeholder={copy.placeholder}
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          returnKeyType="done"
          style={{ paddingHorizontal: 24 }}
          onSubmitEditing={handleContinue}
          className="min-h-16 rounded-[28px] border-[1.5px] border-ink text-[32px] font-bold tracking-[2px] text-ink [font-variant:tabular-nums] placeholder:text-ink-muted dark:border-ink-night dark:text-ink-night dark:placeholder:text-ink-muted-night"
        />
        {error ? (
          <Text accessibilityLiveRegion="assertive" className="text-base leading-6 text-ink dark:text-ink-night">
            {error}
          </Text>
        ) : null}
      </View>
    </OnboardingStep>
  );
}
