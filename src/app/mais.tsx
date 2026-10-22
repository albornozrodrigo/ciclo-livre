import { Alert, ToastAndroid } from 'react-native';

import { PrivacySection } from '@/components/privacy-section';
import { Screen } from '@/components/ui/screen';
import { useEraseAllData } from '@/db/database-root';
import { ptBR } from '@/i18n/pt-BR';

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

  // Apagar remonta as abas (volta para Hoje), então a confirmação vai num toast nativo.
  async function eraseAndNotify() {
    await eraseAllData();
    ToastAndroid.show(ptBR.privacy.erased, ToastAndroid.LONG);
  }

  return (
    <Screen screen="mais" territory="coral" shape={0}>
      <PrivacySection onErase={eraseAndNotify} confirm={confirmEraseAll} />
    </Screen>
  );
}
