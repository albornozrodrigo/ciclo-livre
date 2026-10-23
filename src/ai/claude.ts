import type { Article } from '@/content/search';
import type { AiModel } from '@/domain/ai/models';
import { buildSummaryPrompt, citedArticles } from '@/domain/ai/prompt';

export { AI_MODELS, type AiModel } from '@/domain/ai/models';

/**
 * Chamada HTTP direta à API do Claude. O SDK oficial não carrega no Metro (importação circular:
 * "Cannot read property 'BetaToolRunner' of undefined" no S21 FE), então seguimos o formato da referência cURL.
 */
const API = 'https://api.anthropic.com/v1';
const VERSION = '2026-10-21';
const TIMEOUT_MS = 45_000;

export type AiError = 'invalid_key' | 'billing' | 'rate_limit' | 'overloaded' | 'offline' | 'refusal' | 'cancelled' | 'unknown';

/** Traduz o status HTTP em poucos casos que a tela sabe explicar (sem detalhe técnico). */
function fromStatus(status: number): AiError {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 402) return 'billing';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'overloaded';
  return 'unknown';
}

/**
 * Prazo único para tudo (tentativas e leitura da resposta), cancelável por quem chamou.
 * `run` recebe o sinal e uma forma de esperar qualquer promessa respeitando o prazo.
 */
async function withDeadline<T>(
  outer: AbortSignal | undefined,
  run: (signal: AbortSignal, race: <U>(p: Promise<U>) => Promise<U>) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  // O ouvinte vem antes de qualquer abort: com o sinal de fora já cancelado, a corrida também precisa rejeitar.
  const aborted = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  aborted.catch(() => undefined);
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  outer?.addEventListener('abort', onOuterAbort);
  if (outer?.aborted) controller.abort();
  const race = <U>(p: Promise<U>) => Promise.race([p, aborted]);
  try {
    return await run(controller.signal, race);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuterAbort);
  }
}

function call(path: string, apiKey: string, signal: AbortSignal, init: { method: 'GET' | 'POST'; body?: unknown; beta?: string }) {
  return fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': VERSION,
      'content-type': 'application/json',
      ...(init.beta ? { 'anthropic-beta': init.beta } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal,
  });
}

/** O 400 é sobre o fallback/beta? Lê só a mensagem de erro, que não é mostrada a ninguém. */
async function aboutFallback(response: Response, race: <U>(p: Promise<U>) => Promise<U>): Promise<boolean> {
  try {
    const body = (await race(response.json())) as { error?: { message?: unknown } };
    const message = typeof body?.error?.message === 'string' ? body.error.message.toLowerCase() : '';
    return message.includes('fallback') || message.includes('anthropic-beta');
  } catch {
    return false;
  }
}

type SummaryInput = { apiKey: string; model: AiModel; query: string; articles: readonly Article[]; signal?: AbortSignal };
export type SummaryResult = { ok: true; text: string; cited: Article[] } | { ok: false; error: AiError };
type MessageResponse = { stop_reason?: string; content?: { type: string; text?: string }[] };

/** Resume os artigos encontrados para a pergunta. Vai só a pergunta e trechos dos artigos. */
export async function summarize({ apiKey, model, query, articles, signal: outer }: SummaryInput): Promise<SummaryResult> {
  const prompt = buildSummaryPrompt(query, articles);
  return withDeadline(outer, async (signal, race) => {
    const request = (withFallback: boolean) =>
      call('/messages', apiKey, signal, {
        method: 'POST',
        beta: withFallback ? 'server-side-fallback-2026-07-01' : undefined,
        body: {
          model,
          // O raciocínio adaptativo (ligado por padrão nesses modelos) conta neste limite: folga para a resposta curta.
          max_tokens: 8000,
          output_config: { effort: 'low' },
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
          ...(withFallback ? { fallbacks: 'default' } : {}),
        },
      });
    // Haiku não tem fallback do lado do servidor; os outros caem no modelo recomendado se recusarem.
    const wantsFallback = model !== 'claude-haiku-5-5';
    const failed = (): SummaryResult => ({ ok: false, error: outer?.aborted ? 'cancelled' : 'offline' });
    let response: Response;
    try {
      response = await race(request(wantsFallback));
      // Conta que não aceita o fallback responde 400 falando dele: só aí uma tentativa sem. Outro 400 não se repete.
      if (wantsFallback && response.status === 400 && (await aboutFallback(response, race))) response = await race(request(false));
    } catch {
      // Sem rede, tempo esgotado ou cancelado por quem chamou.
      return failed();
    }
    if (!response.ok) return { ok: false, error: fromStatus(response.status) };
    let data: MessageResponse;
    try {
      data = (await race(response.json())) as MessageResponse;
    } catch {
      return signal.aborted ? failed() : { ok: false, error: 'unknown' };
    }
    if (data.stop_reason === 'refusal') return { ok: false, error: 'refusal' };
    // Cortada no limite: texto pela metade e sem as citações; melhor dizer que não deu.
    if (data.stop_reason === 'max_tokens') return { ok: false, error: 'unknown' };
    const raw = (data.content ?? [])
      .flatMap((b) => (b.type === 'text' && typeof b.text === 'string' ? [b.text] : []))
      .join('\n')
      .trim();
    if (!raw) return { ok: false, error: 'unknown' };
    const text = raw.replace(/\s*\[\[[a-z0-9-]+\]\]/g, '').trim();
    return { ok: true, text, cited: citedArticles(raw, articles) };
  });
}

/** Confere a chave listando modelos (não gera texto, não tem custo). */
export async function testKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: AiError }> {
  try {
    const response = await withDeadline(undefined, (signal, race) => race(call('/models?limit=1', apiKey, signal, { method: 'GET' })));
    return response.ok ? { ok: true } : { ok: false, error: fromStatus(response.status) };
  } catch {
    return { ok: false, error: 'offline' };
  }
}
