import { Alert } from 'react-native';

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

  return (
    <Screen screen="mais" territory="coral" shape={0}>
      <PrivacySection onErase={eraseAllData} confirm={confirmEraseAll} />
    </Screen>
  );
}
