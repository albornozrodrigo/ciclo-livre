import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { SwitchRow } from '@/components/reminders/switch-row';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { useSnackbar } from '@/components/ui/snackbar';
import { type ExportKind, prepareExport, saveToFolder, shareFile } from '@/data-export/export-actions';
import { todayIso } from '@/domain/dates';
import { MIN_PASSWORD, passwordStrength } from '@/domain/export/backup';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';
import { useProfile } from '@/profile/profile-context';

const d = ptBR.data;
const KINDS: readonly ExportKind[] = ['relatorio', 'planilha', 'completo', 'backup'];
const isKind = (v: unknown): v is ExportKind => typeof v === 'string' && (KINDS as readonly string[]).includes(v);

/** Gera um arquivo e manda para onde a pessoa escolher (compartilhar ou pasta, incluindo o Google Drive). */
export default function ExportarScreen() {
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  const db = useSQLiteContext();
  const { state } = useProfile();
  const { show } = useSnackbar();
  const [includeNotes, setIncludeNotes] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const profile = state.status === 'ready' ? state.profile : null;
  if (!isKind(tipo) || !profile) return null;
  const kind = tipo;

  const isBackup = kind === 'backup';
  const mismatch = isBackup && confirm.length > 0 && confirm !== password;
  const ready = !busy && (!isBackup || (password.length >= MIN_PASSWORD && confirm === password));

  async function run(destination: 'share' | 'folder') {
    if (!profile) return;
    setBusy(true);
    try {
      const item = await prepareExport(kind, { db, profile, today: todayIso(), includeNotes, password: isBackup ? password : undefined });
      if (destination === 'share') await shareFile(item);
      else if ((await saveToFolder(item)) === 'saved') show(d.saved);
    } catch (error) {
      log.error('export_failed', error);
      show(d.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title={d.kinds[kind].title} hint={d.kinds[kind].detail}>
      {kind === 'relatorio' ? (
        <View className="gap-1">
          <SwitchRow label={d.includeNotes} detail={d.includeNotesHint} value={includeNotes} onValueChange={setIncludeNotes} />
        </View>
      ) : null}

      {isBackup ? (
        <View className="gap-4">
          <PasswordField label={d.password} value={password} onChange={setPassword} />
          <Text accessibilityLiveRegion="polite" className="text-sm font-bold text-ink dark:text-ink-night">
            {password ? d.passwordStrength[passwordStrength(password)] : d.passwordRules}
          </Text>
          <PasswordField label={d.passwordConfirm} value={confirm} onChange={setConfirm} />
          {mismatch ? <Text className="text-sm font-bold text-ink dark:text-ink-night">{`Erro: ${d.passwordMismatch}`}</Text> : null}
          <Text className="text-base font-bold leading-6 text-ink dark:text-ink-night">{d.passwordWarning}</Text>
        </View>
      ) : null}

      {kind === 'planilha' || kind === 'completo' ? (
        <Text className="text-base leading-6 text-ink dark:text-ink-night">{d.notEncrypted}</Text>
      ) : null}

      <View className="gap-3">
        {busy ? (
          <Text accessibilityLiveRegion="polite" className="text-sm text-ink-muted dark:text-ink-muted-night">
            {isBackup ? d.workingBackup : d.working}
          </Text>
        ) : null}
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{d.shareDetail}</Text>
        <CapsuleButton label={d.share} onPress={() => run('share')} disabled={!ready} accessibilityHint={d.shareHint} />
        <CapsuleButton
          label={d.saveFolder}
          variant="outline"
          onPress={() => run('folder')}
          disabled={!ready}
          accessibilityHint={d.saveFolderHint}
        />
      </View>
    </FormScreen>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        style={{ paddingHorizontal: 20, paddingVertical: 14, minHeight: 56 }}
        className="rounded-[28px] border-[1.5px] border-ink text-base text-ink dark:border-ink-night dark:text-ink-night"
      />
    </View>
  );
}
