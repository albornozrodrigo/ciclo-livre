import { Alert } from 'react-native';

import { ptBR } from '@/i18n/pt-BR';
import { isAppLocked } from '@/security/lock-policy';

const c = ptBR.chat;

/** Diálogo nativo com a ação destrutiva marcada; resolve true só em "Apagar". */
export function confirmClearChat(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      c.clearTitle,
      c.clearBody,
      [
        { text: c.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: c.clearOk, style: 'destructive', onPress: () => resolve(!isAppLocked()) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
