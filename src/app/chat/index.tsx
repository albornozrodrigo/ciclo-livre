import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getApiKey } from '@/ai/key-store';
import { type ChatOutcome, requestChat } from '@/ai/request-chat';
import { ReportResponse } from '@/components/ai/report-response';
import { confirmClearChat } from '@/components/chat/confirm-clear';
import { AttentionNotice } from '@/components/ui/attention-notice';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ListRow } from '@/components/ui/list-row';
import { useSnackbar } from '@/components/ui/snackbar';
import { Palette } from '@/constants/theme';
import { getChatSettings } from '@/db/ai-settings-repo';
import { clearChat, listChat } from '@/db/chat-repo';
import { type ChatTurn, QUESTION_MAX } from '@/domain/ai/chat-prompt';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const c = ptBR.chat;

function errorText(error: Exclude<ChatOutcome, { ok: true }>['error']): string {
  if (error in c.errors) return c.errors[error as keyof typeof c.errors];
  return ptBR.ai.errors[error as keyof typeof ptBR.ai.errors] ?? ptBR.ai.errors.unknown;
}

function Bubble({ turn }: { turn: ChatTurn }) {
  if (turn.role === 'user') {
    // Pergunta da pessoa: cápsula de contorno à direita.
    return (
      <View accessible accessibilityLabel={`${c.you}: ${turn.text}`} className="max-w-[85%] self-end">
        <View className="rounded-[28px] border-[1.5px] border-ink px-5 py-3 dark:border-ink-night">
          <Text className="text-base leading-6 text-ink dark:text-ink-night">{turn.text}</Text>
        </View>
      </View>
    );
  }
  // Resposta: texto corrido, sem quadro, com rótulo pequeno.
  return (
    <View className="gap-1">
      {/* Texto lido como um bloco; o botão de denúncia fica fora para o leitor de tela alcançá-lo. */}
      <View accessible accessibilityLabel={`${c.claude}: ${turn.text}`} className="gap-1">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink-muted dark:text-ink-muted-night">{c.claude}</Text>
        <Text className="text-[17px] leading-7 text-ink dark:text-ink-night">{turn.text}</Text>
      </View>
      <ReportResponse kind="chat" text={turn.text} />
    </View>
  );
}

type LoadState = 'loading' | 'ready' | 'failed';

/** Conversa sobre os próprios dados. Só abre com chave e consentimento do chat; envia só no toque em "Enviar". */
export default function ChatScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { show } = useSnackbar();
  const muted = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'].inkMuted;
  const [load, setLoad] = useState<LoadState>('loading');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const abort = useRef<AbortController | null>(null);
  // Trava síncrona: dois toques seguidos não disparam dois envios (o estado só muda depois do render).
  const sending = useRef(false);
  useEffect(() => () => abort.current?.abort(), []);

  // Portas: sem chave → configurar (e voltar para cá); sem consentimento do chat → consentimento. Relido ao voltar.
  const loadChat = useCallback(() => {
    let active = true;
    Promise.all([getApiKey(), getChatSettings(db), listChat(db)])
      .then(([key, settings, history]) => {
        if (!active) return;
        if (!key) {
          show(c.needKey);
          router.replace({ pathname: '/ia', params: { next: 'chat' } });
        } else if (!settings.consent) router.replace('/chat/consentimento');
        else {
          // Envio em curso: a resposta ainda vai entrar na lista; não sobrescrever com o histórico antigo.
          if (!sending.current) setTurns(history);
          setLoad('ready');
        }
      })
      .catch((e: unknown) => {
        log.error('chat_load_failed', e);
        if (active) setLoad('failed');
      });
    return () => {
      active = false;
    };
  }, [db, show]);
  useFocusEffect(loadChat);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending.current) return;
    sending.current = true;
    setError(null);
    setPending(question);
    setDraft('');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const outcome = await requestChat(db, question, controller.signal);
      if (controller.signal.aborted) return;
      if (outcome.ok) {
        // Mostra a pergunta como foi enviada e gravada (limpa), não o rascunho.
        setTurns((prev) => [...prev, { role: 'user', text: outcome.question }, { role: 'assistant', text: outcome.text }]);
        if (!outcome.saved) show(c.notSaved);
        // O "Pensando…" some; quem usa leitor de tela precisa ouvir que a resposta chegou.
        AccessibilityInfo.announceForAccessibility(`${c.claude}: ${outcome.text}`);
      } else if (outcome.error === 'no_key') {
        router.replace({ pathname: '/ia', params: { next: 'chat' } });
      } else if (outcome.error === 'no_consent') {
        router.replace('/chat/consentimento');
      } else if (outcome.error !== 'cancelled') {
        // A pergunta volta para o campo: nada se perde com o erro.
        setDraft(question);
        setError(errorText(outcome.error));
      }
    } catch (e) {
      log.error('chat_send_failed', e);
      setDraft(question);
      setError(ptBR.ai.errors.unknown);
    } finally {
      // Só quem ainda é o envio atual limpa o estado (um envio cancelado não mexe no seguinte).
      if (abort.current === controller) {
        sending.current = false;
        if (!controller.signal.aborted) setPending(null);
      }
    }
  }

  async function clear() {
    if (!(await confirmClearChat())) return;
    try {
      await clearChat(db);
      setTurns([]);
      show(c.cleared);
    } catch (e) {
      log.error('chat_clear_failed', e);
      show(ptBR.ai.saveFailed);
    }
  }

  const length = draft.trim().length;
  const tooLong = length > QUESTION_MAX;
  const ready = load === 'ready';

  return (
    <KeyboardAvoidingView behavior="padding" style={{ paddingTop: insets.top }} className="flex-1 bg-water dark:bg-water-night">
      <StatusBar style="auto" />
      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 24 }}
        className="flex-1 px-5">
        <Text accessibilityRole="header" className="text-[32px] font-bold leading-[34px] tracking-[-0.96px] text-ink dark:text-ink-night">
          {c.title}
        </Text>
        <Text className="mt-3 text-base leading-6 text-ink-muted dark:text-ink-muted-night">{c.hint}</Text>
        {load === 'failed' ? (
          <View className="mt-6">
            <AttentionNotice
              text={c.loadFailed}
              actionLabel={c.retry}
              onAction={() => {
                setLoad('loading');
                loadChat();
              }}
            />
          </View>
        ) : null}
        {ready ? (
          <View className="mt-6 gap-6">
            <ListRow label={c.showContext} onPress={() => router.push('/chat/contexto')} />
            {turns.length === 0 && !pending ? (
              <View className="gap-3">
                <Text accessibilityRole="header" className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">
                  {c.startersTitle}
                </Text>
                {/* Só preenche o campo: cada envio custa na chave da pessoa, então o envio é sempre um toque em "Enviar". */}
                {c.starters.map((s) => (
                  <CapsuleButton key={s} label={s} variant="outline" onPress={() => setDraft(s)} />
                ))}
              </View>
            ) : null}
            {turns.map((t, i) => (
              <Bubble key={`${i}-${t.role}`} turn={t} />
            ))}
            {pending ? (
              <>
                <Bubble turn={{ role: 'user', text: pending }} />
                <Text accessibilityLiveRegion="polite" className="text-base text-ink-muted dark:text-ink-muted-night">
                  {c.thinking}
                </Text>
              </>
            ) : null}
            {error ? <AttentionNotice text={error} actionLabel={c.retry} onAction={() => send(draft)} /> : null}
            <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{c.disclaimer}</Text>
            {turns.length > 0 ? <CapsuleButton label={c.clear} variant="outline" onPress={clear} disabled={pending !== null} /> : null}
          </View>
        ) : null}
      </ScrollView>
      {ready ? (
        <View style={{ paddingBottom: insets.bottom + 16 }} className="gap-2 px-5 pt-3">
          <TextInput
            accessibilityLabel={c.input}
            placeholder={c.input}
            placeholderTextColor={muted}
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            maxLength={QUESTION_MAX + 200}
            style={{ paddingHorizontal: 20, paddingVertical: 14, minHeight: 56, maxHeight: 140 }}
            className={`rounded-[28px] text-base text-ink dark:text-ink-night ${
              tooLong ? 'border-[3px] border-ink dark:border-ink-night' : 'border-[1.5px] border-ink dark:border-ink-night'
            }`}
          />
          {tooLong ? (
            <Text accessibilityLiveRegion="polite" className="text-sm font-bold text-ink dark:text-ink-night">
              {`Erro: ${c.errors.too_long}`}
            </Text>
          ) : null}
          <View className="flex-row items-center justify-between gap-3">
            <Text style={{ fontVariant: ['tabular-nums'] }} className="text-sm text-ink-muted dark:text-ink-muted-night">
              {c.counter(length, QUESTION_MAX)}
            </Text>
            <View className="min-w-36">
              <CapsuleButton label={c.send} onPress={() => send(draft)} disabled={length === 0 || tooLong || pending !== null} />
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
