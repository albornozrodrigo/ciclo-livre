import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { useSnackbar } from '@/components/ui/snackbar';
import { restoreFromText } from '@/data-export/export-actions';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { useProfile } from '@/profile/profile-context';

const d = ptBR.data;
/** Backup de décadas de registros cabe com folga; acima disso não é arquivo do app. */
const MAX_BYTES = 50 * 1024 * 1024;

function confirmReplace(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      d.confirmTitle,
      d.confirmBody,
      [
        { text: d.confirmCancel, style: 'cancel', onPress: () => resolve(false) },
        { text: d.confirmOk, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Restaura um backup criptografado ou uma exportação completa, substituindo tudo após confirmação.
 * `onDone`: o que fazer depois (em Mais, voltar; no onboarding, nada — o app troca para as abas sozinho).
 */
export function RestoreForm({ onDone }: { onDone: () => void }) {
  const db = useSQLiteContext();
  const { reloadProfile } = useProfile();
  const { show } = useSnackbar();
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick() {
    try {
      const result = await getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size !== undefined && asset.size > MAX_BYTES) {
        show(d.tooBig);
        return;
      }
      const copy = new File(asset.uri);
      const text = await copy.text();
      // A cópia no cache tem dado de saúde: apagar assim que lida.
      if (copy.exists) copy.delete();
      setFile({ name: asset.name, text });
      setNeedsPassword(text.includes('"ciclo-livre-backup"'));
    } catch (error) {
      log.error('restore_pick_failed', error);
      show(d.restoreFailed);
    }
  }

  async function restore() {
    if (!file || !(await confirmReplace())) return;
    setBusy(true);
    try {
      const result = await restoreFromText(db, file.text, needsPassword ? password : undefined);
      if (result === 'needs_password') {
        setNeedsPassword(true);
        return;
      }
      // Perfil novo: a ponte de lembretes reagenda sozinha a partir dele.
      await reloadProfile();
      show(d.restored);
      setFile(null);
      onDone();
    } catch (error) {
      log.error('restore_failed', error);
      show(d.restoreFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title={d.restore.title} hint={d.restore.detail}>
      <View className="gap-3">
        <CapsuleButton label={d.pick} variant="outline" onPress={pick} disabled={busy} />
        {file ? <Text className="text-base text-ink dark:text-ink-night">{d.picked(file.name)}</Text> : null}
      </View>
      {file && needsPassword ? (
        <View className="gap-2">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{d.password}</Text>
          <TextInput
            accessibilityLabel={d.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={{ paddingHorizontal: 20, paddingVertical: 14, minHeight: 56 }}
            className="rounded-[28px] border-[1.5px] border-ink text-base text-ink dark:border-ink-night dark:text-ink-night"
          />
        </View>
      ) : null}
      {file ? (
        <View className="gap-3">
          <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{d.confirmBody}</Text>
          {busy ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-ink-muted dark:text-ink-muted-night">
              {d.restoring}
            </Text>
          ) : null}
          <CapsuleButton label={d.restoreButton} onPress={restore} disabled={busy || (needsPassword && password.length === 0)} />
        </View>
      ) : null}
    </FormScreen>
  );
}
