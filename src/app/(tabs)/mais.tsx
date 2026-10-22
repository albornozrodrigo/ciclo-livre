import { Alert, View } from 'react-native';

import { PrivacySection } from '@/components/privacy-section';
import { ProfileSection } from '@/components/profile-section';
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
        { text: copy.confirmCancel, style: 'cancel', onPress: () => resolve(false) },
        { text: copy.confirmErase, style: 'destructive', onPress: () => resolve(true) },
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
        <PrivacySection onErase={eraseAndNotify} confirm={confirmEraseAll} />
      </View>
    </Screen>
  );
}
