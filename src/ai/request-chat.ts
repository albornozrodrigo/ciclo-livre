import { getChatSettings, getAiSettings, type ChatSettings } from '@/db/ai-settings-repo';
import { addChatPair, listChat } from '@/db/chat-repo';
import { getAnalysisData } from '@/db/cycle-repo';
import { getProfile } from '@/db/profile-repo';
import type { SqlExecutor } from '@/db/types';
import { buildChatPrompt, cleanQuestion, QUESTION_MAX } from '@/domain/ai/chat-prompt';
import { buildDataContext, type DataContext } from '@/domain/ai/data-context';
import { cycleHistory, cycleSummary, measureSeriesAll, symptomFrequency } from '@/domain/analysis/analysis';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import { todayCycleView } from '@/domain/cycle/today';
import { isoFromDate } from '@/domain/dates';
import { chatContextLabels } from '@/i18n/pt-BR-chat';
import { log } from '@/lib/logger';

import { withAiLock } from './ai-lock';
import { type AiError, chat } from './claude';
import { getApiKey } from './key-store';
import { signalsFromAnalysis } from '@/domain/cycle/signals';

/** `question` é a pergunta como foi enviada e gravada (limpa); `saved` false se a gravação falhou. */
export type ChatOutcome =
  | { ok: true; text: string; question: string; saved: boolean }
  | { ok: false; error: AiError | 'no_key' | 'no_consent' | 'busy' | 'empty' | 'too_long' | 'no_profile' };

class NoProfileError extends Error {}

type Scope = Pick<ChatSettings, 'cycles' | 'includeNotes'>;

/**
 * O resumo dos dados, montado agora a partir do banco. A tela mostra este mesmo texto antes do envio;
 * `scope` permite mostrar um escopo ainda não salvo (tela de consentimento).
 */
export async function previewChatContext(db: SqlExecutor, scope?: Scope, now: Date = new Date()): Promise<DataContext> {
  const chosen = scope ?? (await getChatSettings(db));
  const [profile, data, notes] = await Promise.all([
    getProfile(db),
    getAnalysisData(db),
    // Notas são íntimas: só saem do banco quando a pessoa escolheu incluí-las.
    chosen.includeNotes
      ? db.getAllAsync<{ date: string; text: string }>('SELECT date, text FROM log_note ORDER BY date')
      : Promise.resolve([]),
  ]);
  if (!profile) throw new NoProfileError('Sem perfil.');
  const today = isoFromDate(now);
  const signals = signalsFromAnalysis(data);
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
    { cycles: chosen.cycles, includeNotes: chosen.includeNotes },
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
      context = await previewChatContext(db, chatSettings, now);
    } catch (e) {
      if (e instanceof NoProfileError) return { ok: false, error: 'no_profile' };
      log.error('chat_context_failed', e);
      return { ok: false, error: 'unknown' };
    }
    const prompt = buildChatPrompt(context.text, await listChat(db), clean);
    const result = await chat({ apiKey, model: aiSettings.model, system: prompt.system, messages: prompt.messages, signal });
    if (!result.ok) return result;
    // A resposta já foi paga: mesmo se gravar falhar, ela aparece (e a tela avisa que não ficou salva).
    try {
      await addChatPair(db, clean, result.text, now);
      return { ok: true, text: result.text, question: clean, saved: true };
    } catch (e) {
      log.error('chat_save_failed', e);
      return { ok: true, text: result.text, question: clean, saved: false };
    }
  });
}
