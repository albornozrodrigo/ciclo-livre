import type { Article } from '@/content/search';
import { getAiSettings } from '@/db/ai-settings-repo';
import type { SqlExecutor } from '@/db/types';

import { summarize, type SummaryResult } from './claude';
import { getApiKey } from './key-store';

export type SummaryOutcome =
  SummaryResult | { ok: false; error: 'no_key' } | { ok: false; error: 'no_consent' } | { ok: false; error: 'busy' };

/** Um pedido pago por vez no app inteiro (trocar a busca no meio não dispara outro em paralelo). */
let inFlight = false;

/**
 * Ponto único de envio à IA. Consentimento e chave são relidos agora, não do estado da tela:
 * revogar o consentimento vale para o próximo toque, venha de onde vier.
 */
export async function requestSummary(
  db: SqlExecutor,
  query: string,
  articles: readonly Article[],
  signal?: AbortSignal,
): Promise<SummaryOutcome> {
  if (inFlight) return { ok: false, error: 'busy' };
  inFlight = true;
  try {
    const [settings, apiKey] = await Promise.all([getAiSettings(db), getApiKey()]);
    if (!apiKey) return { ok: false, error: 'no_key' };
    if (!settings.consent) return { ok: false, error: 'no_consent' };
    return await summarize({ apiKey, model: settings.model, query, articles, signal });
  } finally {
    inFlight = false;
  }
}
