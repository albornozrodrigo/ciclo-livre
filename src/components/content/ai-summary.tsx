import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { requestSummary, type SummaryOutcome } from '@/ai/request-summary';
import { useAi } from '@/ai/use-ai';
import { CapsuleButton } from '@/components/ui/capsule-button';
import { ListRow } from '@/components/ui/list-row';
import type { Article } from '@/content/search';
import { ptBR } from '@/i18n/pt-BR';
import { log } from '@/lib/logger';

const t = ptBR.ai;

/** "Resumir com IA" sobre os resultados da busca. Só envia com chave salva e consentimento dado. */
export function AiSummary({ query, articles }: { query: string; articles: Article[] }) {
  const db = useSQLiteContext();
  const { state } = useAi();
  type Shown = Exclude<SummaryOutcome, { error: 'no_key' | 'no_consent' }>;
  // Resultado e "gerando" valem para a busca em que nasceram: mudou a busca, somem sozinhos (sem efeito que zera estado).
  const [saved, setSaved] = useState<{ query: string; outcome: Shown } | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const running = useRef(false);
  const normalized = query.trim();
  const result = saved?.query === normalized ? saved.outcome : null;
  const busy = busyFor === normalized;
  // Sair da tela ou mudar a busca cancela o pedido em curso.
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    abort.current?.abort();
    running.current = false;
  }, [normalized]);

  async function run() {
    if (!state || running.current) return;
    running.current = true;
    const forQuery = normalized;
    setBusyFor(forQuery);
    const controller = new AbortController();
    abort.current = controller;
    try {
      // Chave e consentimento são conferidos de novo no envio (requestSummary), não só aqui na tela.
      const outcome = await requestSummary(db, query, articles, controller.signal);
      if (controller.signal.aborted) return;
      if (!outcome.ok && outcome.error === 'no_key') router.push('/ia');
      else if (!outcome.ok && outcome.error === 'no_consent') router.push('/ia/consentimento');
      else setSaved({ query: forQuery, outcome });
    } catch (e) {
      log.error('ai_summary_failed', e);
      if (!controller.signal.aborted) setSaved({ query: forQuery, outcome: { ok: false, error: 'unknown' } });
    } finally {
      if (abort.current === controller) running.current = false;
      setBusyFor((current) => (current === forQuery ? null : current));
    }
  }

  return (
    <View className="gap-3">
      {!result?.ok ? (
        // Contorno: a ação principal do Explorar é ler; a IA é opcional e não compete com os resultados.
        <CapsuleButton label={t.summarize} variant="outline" onPress={run} disabled={busy || !state} accessibilityHint={t.summarizeHint} />
      ) : null}
      {state && !state.key ? <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{t.setupFirst}</Text> : null}
      {busy ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-ink-muted dark:text-ink-muted-night">
          {t.summarizing}
        </Text>
      ) : null}
      {result && !result.ok ? (
        <Text accessibilityLiveRegion="polite" className="text-base font-bold leading-6 text-ink dark:text-ink-night">
          {t.errors[result.error]}
        </Text>
      ) : null}
      {result?.ok ? (
        <View accessibilityLiveRegion="polite" className="gap-3 rounded-[28px] border-[1.5px] border-ink px-5 py-4 dark:border-ink-night">
          <Text accessibilityRole="header" className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">
            {t.summaryTitle}
          </Text>
          <Text className="text-[17px] leading-7 text-ink dark:text-ink-night">{result.text}</Text>
          {result.cited.length > 0 ? (
            <View>
              <Text accessibilityRole="header" className="text-sm font-bold tracking-[0.28px] text-ink-muted dark:text-ink-muted-night">
                {t.basedOn}
              </Text>
              {result.cited.map((a) => (
                <ListRow key={a.id} label={a.title} onPress={() => router.push(`/artigo/${a.id}`)} />
              ))}
            </View>
          ) : null}
          <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{t.summaryDisclaimer}</Text>
        </View>
      ) : null}
    </View>
  );
}
