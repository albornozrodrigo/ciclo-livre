import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { previewChatContext } from '@/ai/request-chat';
import { ContextText } from '@/components/chat/context-text';
import { AttentionNotice } from '@/components/ui/attention-notice';
import { FormScreen } from '@/components/form-screen';
import { SwitchRow } from '@/components/reminders/switch-row';
import { Bullets } from '@/components/ui/bullets';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ChoiceList } from '@/components/ui/choice-list';
import { useSnackbar } from '@/components/ui/snackbar';
import { acceptChatConsent, getChatSettings } from '@/db/ai-settings-repo';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const c = ptBR.chat;
type Cycles = '6' | '12';
const cycleOptions = (['6', '12'] as const).map((value) => ({ value, label: c.cycleOptions[value] }));

function Section({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {title}
      </Text>
      <Bullets items={items} />
    </View>
  );
}

/** Consentimento do chat: o que vai (com o texto exato montado agora), o que nunca vai, para onde e o escopo. */
export default function ChatConsentScreen() {
  const db = useSQLiteContext();
  const { show } = useSnackbar();
  const [cycles, setCycles] = useState<Cycles | null>(null);
  const [includeNotes, setIncludeNotes] = useState(false);
  // O texto vale só para o escopo em que foi montado: mudou o escopo, ele some na hora e "Concordo" espera o novo.
  const [preview, setPreview] = useState<{ key: string; text: string } | null>(null);
  const scopeKey = `${cycles}|${includeNotes}`;
  const text = preview?.key === scopeKey ? preview.text : null;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getChatSettings(db)
      .then((s) => {
        if (!active) return;
        setCycles(String(s.cycles) as Cycles);
        setIncludeNotes(s.includeNotes);
        setFailed(false);
      })
      .catch((e: unknown) => {
        log.error('chat_settings_failed', e);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [db, attempt]);

  // O texto exato muda junto com o escopo, antes de gravar qualquer coisa.
  useEffect(() => {
    if (!cycles) return;
    let active = true;
    const key = `${cycles}|${includeNotes}`;
    previewChatContext(db, { cycles: cycles === '12' ? 12 : 6, includeNotes })
      .then((ctx) => {
        if (!active) return;
        setPreview({ key, text: ctx.text });
        setFailed(false);
      })
      .catch((e: unknown) => {
        log.error('chat_preview_failed', e);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [db, cycles, includeNotes, attempt]);

  async function accept() {
    if (!cycles) return;
    try {
      await acceptChatConsent(db, { cycles: cycles === '12' ? 12 : 6, includeNotes });
      router.replace('/chat');
    } catch (e) {
      log.error('chat_consent_failed', e);
      show(ptBR.ai.saveFailed);
    }
  }

  return (
    <FormScreen
      title={c.consentTitle}
      footer={
        <>
          <CapsuleButton label={c.accept} onPress={accept} disabled={!cycles || text === null || failed} />
          <CapsuleButton
            label={c.decline}
            variant="outline"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/analise'))}
          />
        </>
      }>
      <Section title={c.sentTitle} items={c.sent} />
      <Section title={c.neverTitle} items={c.never} />
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {c.whereTitle}
        </Text>
        <Text className="text-base leading-6 text-ink dark:text-ink-night">{c.where}</Text>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
          {c.scopeTitle}
        </Text>
        <ChoiceList label={c.cycles} options={cycleOptions} value={cycles} onChange={setCycles} />
        <SwitchRow label={c.notes} detail={c.notesHint} value={includeNotes} onValueChange={setIncludeNotes} />
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{c.scopeChangeNote}</Text>
      </View>
      {failed ? (
        <AttentionNotice
          text={c.previewFailed}
          actionLabel={c.retry}
          onAction={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <ContextText text={text} />
      )}
    </FormScreen>
  );
}
