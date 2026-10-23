import { getChatSettings, getAiSettings, type ChatSettings } from '@/db/ai-settings-repo';
import { addChatPair, listChat } from '@/db/chat-repo';
import { getAnalysisData, getCycleSignals } from '@/db/cycle-repo';
import { getProfile } from '@/db/profile-repo';
import type { SqlExecutor } from '@/db/types';
import { buildChatPrompt, cleanQuestion, QUESTION_MAX } from '@/domain/ai/chat-prompt';
import { buildDataContext, type DataContext } from '@/domain/ai/data-context';
import { cycleHistory, cycleSummary, measureSeriesAll, symptomFrequency } from '@/domain/analysis/analysis';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import { todayCycleView } from '@/domain/cycle/today';
import { isoFromDate } from '@/domain/dates';
import { chatContextLabels } from '@/i18n/pt-BR-chat';

import { withAiLock } from './ai-lock';
import { type AiError, chat } from './claude';
import { getApiKey } from './key-store';

export type ChatOutcome =
  { ok: true; text: string } | { ok: false; error: AiError | 'no_key' | 'no_consent' | 'busy' | 'empty' | 'too_long' | 'no_profile' };

type Scope = Pick<ChatSettings, 'cycles' | 'includeNotes'>;

/**
 * O resumo dos dados, montado agora a partir do banco. A tela mostra este mesmo texto antes do envio;
 * `scope` permite mostrar um escopo ainda não salvo (tela de consentimento).
 */
export async function previewChatContext(db: SqlExecutor, scope?: Scope, now: Date = new Date()): Promise<DataContext> {
  const [profile, settings, signals, data, notes] = await Promise.all([
    getProfile(db),
    getChatSettings(db),
    getCycleSignals(db),
    getAnalysisData(db),
    db.getAllAsync<{ date: string; text: string }>('SELECT date, text FROM log_note ORDER BY date'),
  ]);
  if (!profile) throw new Error('Sem perfil.');
  const today = isoFromDate(now);
  const model = cycleModelFor(profile, signals, today);
  return buildDataContext(
    {
      today,
      profile: { mode: profile.mode, birthControl: profile.birthControl },
      todayView: todayCycleView(profile, signals, today),
      summary: model ? cycleSummary(model) : null,
      history: model ? cycleHistory(model) : [],
      symptoms: model ? symptomFrequency(model, data.selections, today) : [],
      measures: measureSeriesAll(data.measures, data.selections, today),
      notes,
    },
    scope ?? { cycles: settings.cycles, includeNotes: settings.includeNotes },
    chatContextLabels,
  );
}

/**
 * Ponto único de envio do chat. Consentimento do chat e chave são relidos agora; os dados são lidos do banco
 * na hora (o texto enviado é o mesmo da prévia). Só guarda a conversa quando a resposta chega.
 */
export async function requestChat(db: SqlExecutor, question: string, signal?: AbortSignal, now: Date = new Date()): Promise<ChatOutcome> {
  const trimmed = question.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  if (trimmed.length > QUESTION_MAX) return { ok: false, error: 'too_long' };
  const clean = cleanQuestion(trimmed);
  if (!clean) return { ok: false, error: 'empty' };

  return withAiLock<ChatOutcome>(async () => {
    const [chatSettings, aiSettings, apiKey] = await Promise.all([getChatSettings(db), getAiSettings(db), getApiKey()]);
    if (!apiKey) return { ok: false, error: 'no_key' };
    if (!chatSettings.consent) return { ok: false, error: 'no_consent' };
    let context: DataContext;
    try {
      context = await previewChatContext(db, undefined, now);
    } catch {
      return { ok: false, error: 'no_profile' };
    }
    const prompt = buildChatPrompt(context.text, await listChat(db), clean);
    const result = await chat({ apiKey, model: aiSettings.model, system: prompt.system, messages: prompt.messages, signal });
    if (!result.ok) return result;
    await addChatPair(db, clean, result.text, now);
    return result;
  });
}
