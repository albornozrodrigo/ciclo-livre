import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { SwitchRow } from '@/components/reminders/switch-row';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { PasswordField } from '@/components/ui/password-field';
import { useSnackbar } from '@/components/ui/snackbar';
import { EXPORT_KINDS, type ExportKind, prepareExport, saveToFolder, shareFile } from '@/data-export/export-actions';
import { todayIso } from '@/domain/dates';
import { MIN_PASSWORD, passwordStrength } from '@/domain/export/backup';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { useProfile } from '@/profile/profile-context';

const d = ptBR.data;
const isKind = (v: unknown): v is ExportKind => typeof v === 'string' && (EXPORT_KINDS as readonly string[]).includes(v);

/** Gera um arquivo e manda para onde a pessoa escolher: Compartilhar (inclui o Google Drive) ou uma pasta do aparelho. */
export default function ExportarScreen() {
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  const db = useSQLiteContext();
  const { state } = useProfile();
  const { show } = useSnackbar();
  const [includeNotes, setIncludeNotes] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  // Trava síncrona: dois toques rápidos não geram duas exportações (o `busy` só desabilita após o render).
  const running = useRef(false);
  const profile = state.status === 'ready' ? state.profile : null;
  if (!isKind(tipo) || !profile) return null;
  const kind = tipo;

  const isBackup = kind === 'backup';
  const mismatch = isBackup && confirm.length > 0 && confirm !== password;
  const ready = !busy && (!isBackup || (password.length >= MIN_PASSWORD && confirm === password));

  async function run(destination: 'share' | 'folder') {
    if (!profile || running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const item = await prepareExport(kind, { db, profile, today: todayIso(), includeNotes, password: isBackup ? password : undefined });
      if (destination === 'share') await shareFile(item);
      else if ((await saveToFolder(item)) === 'saved') show(d.saved);
    } catch (error) {
      log.error('export_failed', error);
      show(d.failed);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <FormScreen
      title={d.kinds[kind].title}
      hint={d.kinds[kind].detail}
      footer={
        <>
          {busy ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-ink-muted dark:text-ink-muted-night">
              {isBackup ? d.workingBackup : d.working}
            </Text>
          ) : null}
          <CapsuleButton label={d.share} onPress={() => run('share')} disabled={!ready} accessibilityHint={d.shareHint} />
          <CapsuleButton
            label={d.saveFolder}
            variant="outline"
            onPress={() => run('folder')}
            disabled={!ready}
            accessibilityHint={d.saveFolderHint}
          />
        </>
      }>
      {kind === 'relatorio' ? (
        <View className="gap-1">
          <SwitchRow label={d.includeNotes} detail={d.includeNotesHint} value={includeNotes} onValueChange={setIncludeNotes} />
        </View>
      ) : null}

      {isBackup ? (
        <View className="gap-4">
          <PasswordField label={d.password} value={password} onChange={setPassword} newPassword />
          <Text accessibilityLiveRegion="polite" className="text-sm font-bold text-ink dark:text-ink-night">
            {password ? d.passwordStrength[passwordStrength(password)] : d.passwordRules}
          </Text>
          <PasswordField
            label={d.passwordConfirm}
            value={confirm}
            onChange={setConfirm}
            error={mismatch ? d.passwordMismatch : null}
            newPassword
          />
          <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{d.passwordWarning}</Text>
        </View>
      ) : null}

      {kind === 'planilha' || kind === 'completo' ? (
        <Text className="text-base leading-6 text-ink dark:text-ink-night">{d.notEncrypted}</Text>
      ) : null}

      <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{d.shareDetail}</Text>
    </FormScreen>
  );
}
