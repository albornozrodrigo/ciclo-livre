import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CapsuleButton } from '@/components/ui/capsule-button';
import type { Step } from '@/domain/onboarding';
import { ptBR } from '@/i18n/pt-BR';
import { stepPosition } from '@/onboarding/routes';
import { useOnboardingDraft } from '@/onboarding/draft';

type Props = {
  step: Step;
  title: string;
  why?: string;
  children?: ReactNode;
  primaryLabel?: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  /** Saída opcional ("Não lembro", "Pular"): cápsula de contorno acima da principal. */
  secondary?: { label: string; onPress: () => void };
};

/** Um passo do onboarding: uma pergunta, conteúdo rolável, ações na zona do polegar. */
export function OnboardingStep({ step, title, why, children, primaryLabel, onPrimary, primaryDisabled, secondary }: Props) {
  const insets = useSafeAreaInsets();
  const { draft } = useOnboardingDraft();
  const { current, total } = stepPosition(step, draft.mode);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ paddingTop: insets.top }} className="flex-1 bg-water dark:bg-water-night">
      {/* Sem lobo atrás da barra de status nos passos: os ícones seguem o tema. */}
      <StatusBar style="auto" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }} className="flex-1 px-5">
        <Progress current={current} total={total} />
        <Text
          accessibilityRole="header"
          className="mt-8 text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night">
          {title}
        </Text>
        {why ? <Text className="mt-3 text-base leading-6 text-ink-muted dark:text-ink-muted-night">{why}</Text> : null}
        <View className="mt-8">{children}</View>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 16 }} className="gap-3 px-5 pt-3">
        {secondary ? <CapsuleButton variant="outline" label={secondary.label} onPress={secondary.onPress} /> : null}
        <CapsuleButton label={primaryLabel ?? ptBR.onboarding.continue} onPress={onPrimary} disabled={primaryDisabled} />
      </View>
    </KeyboardAvoidingView>
  );
}

/** "Passo N de M" + barra segmentada em tinta. */
function Progress({ current, total }: { current: number; total: number }) {
  const label = ptBR.onboarding.step(current, total);
  return (
    <View accessible accessibilityLabel={label} className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink-muted dark:text-ink-muted-night">{label}</Text>
      <View className="flex-row gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={
              i < current
                ? 'h-2 flex-1 rounded-full bg-ink dark:bg-ink-night'
                : 'h-2 flex-1 rounded-full border-[1.5px] border-ink dark:border-ink-night'
            }
          />
        ))}
      </View>
    </View>
  );
}
