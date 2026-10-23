import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { PasswordField } from '@/components/ui/password-field';
import { useSnackbar } from '@/components/ui/snackbar';
import { pickDocument } from '@/data-export/pick-document';
import { applyRestore, readRestore } from '@/data-export/export-actions';
import { BACKUP_ERROR } from '@/domain/export/backup';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { useProfile } from '@/profile/profile-context';
import { isAppLocked } from '@/security/lock-policy';

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
        { text: d.confirmOk, style: 'destructive', onPress: () => resolve(!isAppLocked()) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

type Props = {
  /** Depois de restaurar: em Mais, voltar; no onboarding, nada (o app troca para as abas sozinho). */
  onDone: () => void;
  /** false na primeira abertura: não há dados para substituir, então nem aviso nem confirmação. */
  replacing?: boolean;
};

/** Restaura um backup criptografado ou uma exportação completa. Ordem: conferir o arquivo → confirmar → substituir. */
export function RestoreForm({ onDone, replacing = true }: Props) {
  const db = useSQLiteContext();
  const { reloadProfile } = useProfile();
  const { show } = useSnackbar();
  const [file, setFile] = useState<{ name: string; text: string; encrypted: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ field: 'password' | 'file'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  async function pick() {
    try {
      const picked = await pickDocument(MAX_BYTES, (f) => f.text());
      if (picked.status === 'cancelled') return;
      setPassword('');
      setError(null);
      if (picked.status === 'too_large') {
        setFile(null);
        setError({ field: 'file', text: d.tooBig });
        return;
      }
      const text = picked.content;
      // Decide pelo formato do arquivo (não por texto solto, que pode estar numa nota).
      const read = await readRestore(text).catch(() => null);
      if (!read) {
        setFile(null);
        setError({ field: 'file', text: d.notAppFile });
        return;
      }
      setFile({ name: picked.name, text, encrypted: read.kind === 'needs_password' });
    } catch (e) {
      log.error('restore_pick_failed', e);
      show(d.restoreFailed);
    }
  }

  async function restore() {
    if (!file || running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      // 1. Conferir (descriptografar e validar) sem mexer em nada.
      let read;
      try {
        read = await readRestore(file.text, file.encrypted ? password : undefined);
      } catch (e) {
        const wrongPassword = e instanceof Error && e.message === BACKUP_ERROR;
        setError(wrongPassword ? { field: 'password', text: d.wrongPassword } : { field: 'file', text: d.notAppFile });
        return;
      }
      if (read.kind !== 'ready') return;
      // 2. Só agora, com o arquivo bom, confirmar a substituição.
      if (replacing && !(await confirmReplace())) return;
      // 3. Substituir tudo.
      await applyRestore(db, read.data);
      // Perfil novo: a ponte de lembretes reagenda sozinha a partir dele.
      await reloadProfile();
      setPassword('');
      setFile(null);
      show(d.restored);
      onDone();
    } catch (e) {
      log.error('restore_failed', e);
      show(d.restoreFailed);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <FormScreen title={d.restore.title} hint={d.restore.detail}>
      <View className="gap-3">
        {/* O sol acompanha o próximo passo: escolher, depois restaurar. */}
        <CapsuleButton label={d.pick} variant={file ? 'outline' : 'primary'} onPress={pick} disabled={busy} />
        {file ? <Text className="text-base text-ink dark:text-ink-night">{d.picked(file.name)}</Text> : null}
        {error?.field === 'file' ? (
          <Text accessibilityLiveRegion="polite" className="text-base font-bold text-ink dark:text-ink-night">
            {`Erro: ${error.text}`}
          </Text>
        ) : null}
      </View>
      {file?.encrypted ? (
        <PasswordField
          label={d.password}
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (error?.field === 'password') setError(null);
          }}
          error={error?.field === 'password' ? error.text : null}
        />
      ) : null}
      {file ? (
        <View className="gap-3">
          {replacing ? <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{d.confirmBody}</Text> : null}
          {busy ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-ink-muted dark:text-ink-muted-night">
              {d.restoring}
            </Text>
          ) : null}
          <CapsuleButton label={d.restoreButton} onPress={restore} disabled={busy || (file.encrypted && password.length === 0)} />
        </View>
      ) : null}
    </FormScreen>
  );
}
