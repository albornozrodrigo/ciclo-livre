import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CapsuleButton } from '@/components/ui/capsule-button';
import { Lobe, useLobeHeight } from '@/components/ui/lobe';
import { ptBR } from '@/i18n/pt-BR';
import { STEP_ROUTES } from '@/onboarding/routes';

const copy = ptBR.onboarding.welcome;

/** Boas-vindas: um lobo de sol dominante com o nome, as três promessas e a ação no polegar. */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const lobeHeight = useLobeHeight();

  return (
    <ScrollView className="flex-1 bg-water dark:bg-water-night" contentContainerStyle={{ flexGrow: 1 }}>
      <Lobe territory="sun" shape={2} />
      <View style={{ paddingTop: insets.top + 56, minHeight: lobeHeight }} className="px-5">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-[56px] font-bold leading-[54px] tracking-[-2.24px] text-ink">
          {copy.title}
        </Text>
      </View>

      {/* O apoio fica na água, não no lobo: com fonte grande ele cresce sem sair do território. */}
      <Text className="px-5 pt-6 text-lg leading-7 text-ink dark:text-ink-night">{copy.lead}</Text>

      <View style={{ paddingBottom: insets.bottom + 16 }} className="flex-1 justify-end gap-6 px-5 pt-6">
        <View className="gap-3">
          {copy.promises.map((promise) => (
            <View key={promise} className="flex-row items-start gap-3">
              <View className="mt-2 h-2.5 w-2.5 rounded-full bg-ink dark:bg-ink-night" />
              <Text className="flex-1 text-base leading-6 text-ink dark:text-ink-night">{promise}</Text>
            </View>
          ))}
        </View>
        <CapsuleButton label={copy.start} onPress={() => router.push(STEP_ROUTES.birth_year)} />
      </View>
    </ScrollView>
  );
}
