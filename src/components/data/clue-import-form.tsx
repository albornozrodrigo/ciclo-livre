import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { PasswordField } from '@/components/ui/password-field';
import { useSnackbar } from '@/components/ui/snackbar';
import { pickDocument } from '@/data-export/pick-document';
import { applyClueImport, ClueLimitError, type CluePreview, previewClueImport } from '@/db/clue-import-repo';
import { CLUE_LIMITS, type ClueImport } from '@/domain/clue/clue';
import { ClueReadError, type ClueReadReason, readClueBytes } from '@/domain/clue/read';
import { ptBR } from '@/i18n/pt-BR';
import { categoryLabels } from '@/i18n/pt-BR-tracking';
import { log } from '@/lib/logger';
import { useProfile } from '@/profile/profile-context';
import { syncReminders } from '@/reminders/sync';

const c = ptBR.data.clue;
const br = (iso: string) => iso.split('-').reverse().join('/');

function labelOf(category: string): string {
  if (category === 'notes') return c.notesLabel;
  if (category === 'tags') return c.tagsLabel;
  return categoryLabels(category).label;
}

type Props = { onDone: () => void };

/** Importa o histórico do Clue juntando ao que existe. Ordem: escolher → (senha) → ler e mostrar a prévia → importar. */
export function ClueImportForm({ onDone }: Props) {
  const db = useSQLiteContext();
  const { state } = useProfile();
  const { show } = useSnackbar();
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; encrypted: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState<{ data: ClueImport; preview: CluePreview; invalid: number } | null>(null);
  const [error, setError] = useState<{ field: 'password' | 'file'; text: string } | null>(null);
  const [busy, setBusy] = useState<'reading' | 'importing' | null>(null);
  const running = useRef(false);

  const fail = (reason: ClueReadReason) => setError({ field: reason === 'wrong_password' ? 'password' : 'file', text: c.errors[reason] });

  async function loadPreview(bytes: Uint8Array, pass?: string) {
    const read = await readClueBytes(bytes, pass);
    if (read.kind === 'needs_password') return false;
    setReady({ data: read.data, preview: await previewClueImport(db, read.data), invalid: read.invalid });
    return true;
  }

  async function guarded(kind: 'reading' | 'importing', fn: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(kind);
    try {
      await fn();
    } finally {
      running.current = false;
      setBusy(null);
    }
  }

  const pick = () =>
    guarded('reading', async () => {
      try {
        const picked = await pickDocument(CLUE_LIMITS.bytes, (f) => f.bytes());
        if (picked.status === 'cancelled') return;
        setFile(null);
        setReady(null);
        setPassword('');
        setError(null);
        if (picked.status === 'too_large') return fail('too_large');
        const opened = await loadPreview(picked.content);
        setFile({ name: picked.name, bytes: picked.content, encrypted: !opened });
      } catch (e) {
        if (e instanceof ClueReadError) return fail(e.reason);
        log.error('clue_pick_failed', e);
        show(c.failed);
      }
    });

  const unlock = () =>
    guarded('reading', async () => {
      if (!file) return;
      setError(null);
      try {
        await loadPreview(file.bytes, password);
      } catch (e) {
        if (e instanceof ClueReadError) return fail(e.reason);
        log.error('clue_read_failed', e);
        show(c.failed);
      }
    });

  const runImport = () =>
    guarded('importing', async () => {
      if (!ready) return;
      try {
        await applyClueImport(db, ready.data);
        // Menstruações novas mudam as previsões: reagendar os lembretes já.
        if (state.status === 'ready') await syncReminders(db, state.profile).catch((e: unknown) => log.error('reminders_sync_failed', e));
        log.event('clue_imported', { days: ready.preview.days });
        setFile(null);
        setReady(null);
        setPassword('');
        show(c.done);
        onDone();
      } catch (e) {
        if (e instanceof ClueLimitError) return show(c.limitReached);
        log.error('clue_import_failed', e);
        show(c.failed);
      }
    });

  const p = ready?.preview;
  const nothingNew = p ? p.byCategory.length === 0 : false;

  return (
    <FormScreen title={c.title} hint={c.detail}>
      <View className="gap-2">
        {c.steps.map((step, i) => (
          <View key={step} className="flex-row gap-3">
            <Text className="w-5 text-base font-bold text-ink dark:text-ink-night">{`${i + 1}.`}</Text>
            <Text className="flex-1 text-base leading-6 text-ink dark:text-ink-night">{step}</Text>
          </View>
        ))}
      </View>

      <View className="gap-3">
        <CapsuleButton label={c.pick} variant={file ? 'outline' : 'primary'} onPress={pick} disabled={busy !== null} />
        {file ? <Text className="text-base text-ink dark:text-ink-night">{ptBR.data.picked(file.name)}</Text> : null}
        {error?.field === 'file' ? (
          <Text accessibilityLiveRegion="polite" className="text-base font-bold text-ink dark:text-ink-night">
            {`Erro: ${error.text}`}
          </Text>
        ) : null}
      </View>

      {file?.encrypted && !ready ? (
        <View className="gap-3">
          <PasswordField
            label={c.password}
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (error?.field === 'password') setError(null);
            }}
            error={error?.field === 'password' ? error.text : null}
          />
          <CapsuleButton label={c.check} onPress={unlock} disabled={busy !== null || password.length === 0} />
        </View>
      ) : null}

      {busy ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-ink-muted dark:text-ink-muted-night">
          {busy === 'reading' ? c.reading : c.importing}
        </Text>
      ) : null}

      {p ? (
        <View className="gap-4">
          <View className="gap-1">
            <Text accessibilityRole="header" className="text-xl font-bold text-ink dark:text-ink-night">
              {c.previewTitle}
            </Text>
            {p.range ? <Text className="text-base text-ink dark:text-ink-night">{c.range(br(p.range.from), br(p.range.to))}</Text> : null}
            <Text className="text-base text-ink dark:text-ink-night">{c.days(p.days)}</Text>
            <Text className="text-base text-ink dark:text-ink-night">{c.existing(p.existingDays)}</Text>
          </View>

          {nothingNew ? (
            <Text className="text-base font-bold text-ink dark:text-ink-night">{c.nothingNew}</Text>
          ) : (
            <View>
              {p.byCategory.map((row) => (
                <View
                  key={row.category}
                  accessible
                  accessibilityLabel={`${labelOf(row.category)}: ${row.count}`}
                  className="min-h-14 flex-row items-center justify-between border-b border-line dark:border-line-night">
                  <Text className="flex-1 text-base text-ink dark:text-ink-night">{labelOf(row.category)}</Text>
                  <Text style={{ fontVariant: ['tabular-nums'] }} className="text-base font-bold text-ink dark:text-ink-night">
                    {row.count}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {p.kept > 0 ? <Text className="text-base leading-6 text-ink dark:text-ink-night">{c.kept(p.kept)}</Text> : null}
          {p.truncatedNotes > 0 ? (
            <Text className="text-base leading-6 text-ink dark:text-ink-night">{c.truncated(p.truncatedNotes)}</Text>
          ) : null}
          {ready && ready.invalid > 0 ? (
            <Text className="text-base leading-6 text-ink dark:text-ink-night">{c.invalid(ready.invalid)}</Text>
          ) : null}

          {p.unknown.length > 0 ? (
            <View className="gap-1">
              <Text accessibilityRole="header" className="text-base font-bold text-ink dark:text-ink-night">
                {c.unknownTitle}
              </Text>
              <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{c.unknownHint}</Text>
              {p.unknown.map((u) => (
                <Text key={u.key} className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
                  {c.unknownItem(u.key.replace(/_/g, ' ').replace(':', ': '), u.count)}
                </Text>
              ))}
            </View>
          ) : null}

          {!nothingNew ? <CapsuleButton label={c.importButton} onPress={runImport} disabled={busy !== null} /> : null}
        </View>
      ) : null}
    </FormScreen>
  );
}
