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

export type AiError = 'invalid_key' | 'billing' | 'rate_limit' | 'overloaded' | 'offline' | 'refusal' | 'unknown';

/** Traduz o status HTTP em poucos casos que a tela sabe explicar (sem detalhe técnico). */
function fromStatus(status: number): AiError {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 402) return 'billing';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'overloaded';
  return 'unknown';
}

async function call(path: string, apiKey: string, init: { method: 'GET' | 'POST'; body?: unknown; beta?: string }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API}${path}`, {
      method: init.method,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': VERSION,
        'content-type': 'application/json',
        ...(init.beta ? { 'anthropic-beta': init.beta } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

type SummaryInput = { apiKey: string; model: AiModel; query: string; articles: readonly Article[] };
export type SummaryResult = { ok: true; text: string; cited: Article[] } | { ok: false; error: AiError };
type MessageResponse = { stop_reason?: string; content?: { type: string; text?: string }[] };

/** Resume os artigos encontrados para a pergunta. Vai só a pergunta e trechos dos artigos. */
export async function summarize({ apiKey, model, query, articles }: SummaryInput): Promise<SummaryResult> {
  const prompt = buildSummaryPrompt(query, articles);
  // Haiku não tem fallback do lado do servidor; os outros caem no modelo recomendado se recusarem.
  const withFallback = model !== 'claude-haiku-5-5';
  let response: Response;
  try {
    response = await call('/messages', apiKey, {
      method: 'POST',
      beta: withFallback ? 'server-side-fallback-2026-07-01' : undefined,
      body: {
        model,
        max_tokens: 1024,
        output_config: { effort: 'low' },
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
        ...(withFallback ? { fallbacks: 'default' } : {}),
      },
    });
  } catch {
    // Sem rede ou tempo esgotado.
    return { ok: false, error: 'offline' };
  }
  if (!response.ok) return { ok: false, error: fromStatus(response.status) };
  let data: MessageResponse;
  try {
    data = (await response.json()) as MessageResponse;
  } catch {
    return { ok: false, error: 'unknown' };
  }
  if (data.stop_reason === 'refusal') return { ok: false, error: 'refusal' };
  const raw = (data.content ?? [])
    .flatMap((b) => (b.type === 'text' && typeof b.text === 'string' ? [b.text] : []))
    .join('\n')
    .trim();
  if (!raw) return { ok: false, error: 'unknown' };
  const text = raw.replace(/\s*\[\[[a-z0-9-]+\]\]/g, '').trim();
  return { ok: true, text, cited: citedArticles(raw, articles) };
}

/** Confere a chave listando modelos (não gera texto, não tem custo). */
export async function testKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: AiError }> {
  try {
    const response = await call('/models?limit=1', apiKey, { method: 'GET' });
    return response.ok ? { ok: true } : { ok: false, error: fromStatus(response.status) };
  } catch {
    return { ok: false, error: 'offline' };
  }
}
