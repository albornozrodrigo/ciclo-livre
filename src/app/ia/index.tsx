import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { AI_MODELS, testKey } from '@/ai/claude';
import { deleteApiKey, maskKey, saveApiKey } from '@/ai/key-store';
import { useAi } from '@/ai/use-ai';
import { confirmClearChat } from '@/components/chat/confirm-clear';
import { FormScreen } from '@/components/form-screen';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ChoiceList } from '@/components/ui/choice-list';
import { ListRow } from '@/components/ui/list-row';
import { PasswordField } from '@/components/ui/password-field';
import { useSnackbar } from '@/components/ui/snackbar';
import { getChatSettings, revokeChatConsent, setAiConsent, setAiModel } from '@/db/ai-settings-repo';
import { clearChat, listChat } from '@/db/chat-repo';
import type { SqlExecutor } from '@/db/types';
import { validApiKeyFormat } from '@/domain/ai/prompt';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const t = ptBR.ai;
const modelOptions = AI_MODELS.map((value) => ({ value, label: t.models[value].label, detail: t.models[value].detail }));

const c = ptBR.chat;

/** Perguntas sobre os dados: consentimento próprio (revogável) e apagar a conversa guardada no aparelho. */
function ChatSection({ db, show }: { db: SqlExecutor; show: (text: string) => void }) {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [hasConversation, setHasConversation] = useState(false);
  // Relido ao voltar para a tela (ex.: depois de concordar e conversar no chat).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getChatSettings(db), listChat(db)])
        .then(([s, turns]) => {
          if (!active) return;
          setConsent(s.consent);
          setHasConversation(turns.length > 0);
        })
        .catch((e: unknown) => log.error('chat_settings_failed', e));
      return () => {
        active = false;
      };
    }, [db]),
  );

  async function revoke() {
    try {
      await revokeChatConsent(db);
      setConsent(false);
      setHasConversation(false);
      show(c.revoked);
    } catch (e) {
      log.error('chat_consent_failed', e);
      show(t.saveFailed);
    }
  }

  async function clear() {
    if (!(await confirmClearChat())) return;
    try {
      await clearChat(db);
      setHasConversation(false);
      show(c.cleared);
    } catch (e) {
      log.error('chat_clear_failed', e);
      show(t.saveFailed);
    }
  }

  if (consent === null) return null;
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {c.section}
      </Text>
      <Text className="text-base text-ink dark:text-ink-night">{consent ? c.consentOn : c.consentOff}</Text>
      {consent ? (
        <CapsuleButton label={c.revoke} variant="outline" onPress={revoke} />
      ) : (
        <ListRow label={c.review} onPress={() => router.push('/chat/consentimento')} />
      )}
      {hasConversation ? <CapsuleButton label={c.clear} variant="outline" onPress={clear} /> : null}
    </View>
  );
}

/** Mais → IA com sua chave: chave (armazenamento seguro), modelo e consentimento. */
export default function IaScreen() {
  const { db, state, reload } = useAi();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { show } = useSnackbar();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state) return null;

  async function save() {
    const key = draft.trim();
    if (!validApiKeyFormat(key)) {
      setError(t.keyInvalidFormat);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Testa antes de guardar (listar modelos não tem custo).
      const result = await testKey(key);
      if (!result.ok) {
        setError(result.error === 'invalid_key' ? t.keyRejected : t.errors[result.error]);
        return;
      }
      await saveApiKey(key);
      setDraft('');
      await reload();
      show(t.keyOk);
      // Veio do chat sem chave: segue para o consentimento das perguntas.
      if (next === 'chat') router.replace((await getChatSettings(db)).consent ? '/chat' : '/chat/consentimento');
    } catch (e) {
      log.error('ai_key_save_failed', e);
      setError(t.errors.unknown);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await deleteApiKey();
      await reload();
      show(t.keyRemoved);
    } catch (e) {
      log.error('ai_key_delete_failed', e);
      show(t.saveFailed);
    }
  }

  return (
    <FormScreen title={t.title} hint={t.hint}>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {t.keySection}
        </Text>
        {state.key ? (
          <>
            <Text className="text-base font-bold text-ink dark:text-ink-night">{t.keySaved(maskKey(state.key))}</Text>
            <CapsuleButton label={t.removeKey} variant="outline" onPress={remove} />
          </>
        ) : (
          <>
            <PasswordField label={t.keyLabel} value={draft} onChange={setDraft} error={error} noAutofill />
            <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{t.keyHelp}</Text>
            {busy ? (
              <Text accessibilityLiveRegion="polite" className="text-sm text-ink-muted dark:text-ink-muted-night">
                {t.testing}
              </Text>
            ) : null}
            <CapsuleButton label={t.saveKey} onPress={save} disabled={busy || draft.trim().length === 0} />
          </>
        )}
      </View>

      <View className="gap-2">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {t.model}
        </Text>
        <ChoiceList
          label={t.model}
          options={modelOptions}
          value={state.settings.model}
          onChange={(model) =>
            setAiModel(db, model)
              .then(reload)
              .catch((e: unknown) => {
                log.error('ai_model_save_failed', e);
                show(t.saveFailed);
              })
          }
        />
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {t.consentSection}
        </Text>
        <Text className="text-base text-ink dark:text-ink-night">{state.settings.consent ? t.consentOn : t.consentOff}</Text>
        <ListRow label={t.consentReview} onPress={() => router.push('/ia/consentimento')} />
        {state.settings.consent ? (
          <CapsuleButton
            label={t.revoke}
            variant="outline"
            onPress={() =>
              setAiConsent(db, false)
                .then(reload)
                .then(() => show(t.revoked))
                .catch((e: unknown) => {
                  log.error('ai_consent_failed', e);
                  show(t.saveFailed);
                })
            }
          />
        ) : null}
      </View>
      <ChatSection db={db} show={show} />
    </FormScreen>
  );
}
