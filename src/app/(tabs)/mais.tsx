import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { PrivacySection } from '@/components/privacy-section';
import { ProfileSection } from '@/components/profile-section';
import { ListRow } from '@/components/ui/list-row';
import { useSnackbar } from '@/components/ui/snackbar';
import { Screen } from '@/components/ui/screen';
import { useEraseAllData } from '@/db/database-root';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

/** Diálogo nativo (Material) com a ação destrutiva marcada; resolve true só em "Apagar tudo". */
function confirmEraseAll(): Promise<boolean> {
  const copy = ptBR.privacy;
  return new Promise((resolve) => {
    Alert.alert(
      copy.confirmTitle,
      copy.confirmBody,
      [
        {
          text: copy.confirmCancel,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: copy.confirmErase,
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export default function MaisScreen() {
  const eraseAllData = useEraseAllData();
  const { show } = useSnackbar();

  // Apagar remonta o app (volta ao onboarding); o snackbar fica acima do banco e sobrevive.
  async function eraseAndNotify() {
    try {
      await eraseAllData();
      show(ptBR.privacy.erased);
    } catch (error) {
      log.error('erase_all_failed', error);
      show(ptBR.privacy.eraseFailed);
    }
  }

  return (
    <Screen screen="mais" territory="coral" shape={0}>
      <View className="gap-10">
        <ProfileSection />
        <View className="gap-1">
          <Text accessibilityRole="header" className="mb-2 text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
            {ptBR.reminders.title}
          </Text>
          <ListRow label={ptBR.reminders.mais} detail={ptBR.reminders.maisHint} onPress={() => router.push('/lembretes')} />
        </View>
        <View className="gap-1">
          <Text accessibilityRole="header" className="mb-2 text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
            {ptBR.data.title}
          </Text>
          <ListRow label={ptBR.data.mais} detail={ptBR.data.maisHint} onPress={() => router.push('/dados')} />
        </View>
        <View className="gap-1">
          <Text accessibilityRole="header" className="mb-2 text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
            {ptBR.ai.title}
          </Text>
          <ListRow label={ptBR.ai.mais} detail={ptBR.ai.maisHint} onPress={() => router.push('/ia')} />
        </View>
        <PrivacySection onErase={eraseAndNotify} confirm={confirmEraseAll} />
      </View>
    </Screen>
  );
}
