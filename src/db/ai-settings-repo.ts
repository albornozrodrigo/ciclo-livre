import { type AiModel, AI_MODELS, isAiModel } from '@/domain/ai/models';

import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';
import { writeMeta } from './meta';

const CONSENT_KEY = 'ai_consent';
const MODEL_KEY = 'ai_model';
// Chat com os dados: consentimento separado (aqui vão dados de saúde, no resumo de artigos não).
const CHAT_CONSENT_KEY = 'ai_chat_consent';
const CHAT_CYCLES_KEY = 'ai_chat_cycles';
const CHAT_NOTES_KEY = 'ai_chat_notes';

export type AiSettings = { consent: boolean; model: AiModel };

/** Preferências da IA (não sensíveis). A chave em si fica no armazenamento seguro, nunca aqui. */
export async function getAiSettings(db: SqlExecutor): Promise<AiSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_meta WHERE key IN (?, ?)',
    CONSENT_KEY,
    MODEL_KEY,
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const model = map.get(MODEL_KEY);
  return { consent: map.get(CONSENT_KEY) === '1', model: isAiModel(model) ? model : AI_MODELS[0] };
}

const upsert = (db: SqlExecutor, key: string, value: string) => enqueueWrite(db, () => writeMeta(db, key, value));

export const setAiConsent = (db: SqlExecutor, consent: boolean) => upsert(db, CONSENT_KEY, consent ? '1' : '0');

export async function setAiModel(db: SqlExecutor, model: AiModel): Promise<void> {
  if (!isAiModel(model)) throw new Error('Modelo inválido.');
  await upsert(db, MODEL_KEY, model);
}

export type ChatSettings = { consent: boolean; cycles: 6 | 12; includeNotes: boolean };

export async function getChatSettings(db: SqlExecutor): Promise<ChatSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_meta WHERE key IN (?, ?, ?)',
    CHAT_CONSENT_KEY,
    CHAT_CYCLES_KEY,
    CHAT_NOTES_KEY,
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    consent: map.get(CHAT_CONSENT_KEY) === '1',
    cycles: map.get(CHAT_CYCLES_KEY) === '12' ? 12 : 6,
    includeNotes: map.get(CHAT_NOTES_KEY) === '1',
  };
}

export const setChatConsent = (db: SqlExecutor, consent: boolean) => upsert(db, CHAT_CONSENT_KEY, consent ? '1' : '0');

export async function setChatScope(db: SqlExecutor, scope: { cycles: 6 | 12; includeNotes: boolean }): Promise<void> {
  if (scope.cycles !== 6 && scope.cycles !== 12) throw new Error('Escopo inválido.');
  await upsert(db, CHAT_CYCLES_KEY, String(scope.cycles));
  await upsert(db, CHAT_NOTES_KEY, scope.includeNotes ? '1' : '0');
}

/**
 * Revoga o consentimento do chat e apaga a conversa numa transação: respostas antigas podem citar dados
 * (até notas) e não podem voltar a sair sob um consentimento novo.
 */
export async function revokeChatConsent(db: SqlExecutor): Promise<void> {
  await enqueueWrite(db, () =>
    db.withTransactionAsync(async () => {
      await writeMeta(db, CHAT_CONSENT_KEY, '0');
      await db.runAsync('DELETE FROM chat_message');
    }),
  );
}

/**
 * Concorda com o envio no escopo escolhido. Se o escopo mudou (ex.: notas desligadas), a conversa antiga
 * é apagada: ela foi feita com outros dados e iria junto nas próximas perguntas.
 */
export async function acceptChatConsent(db: SqlExecutor, scope: { cycles: 6 | 12; includeNotes: boolean }): Promise<void> {
  if (scope.cycles !== 6 && scope.cycles !== 12) throw new Error('Escopo inválido.');
  const before = await getChatSettings(db);
  const changed = before.cycles !== scope.cycles || before.includeNotes !== scope.includeNotes;
  await enqueueWrite(db, () =>
    db.withTransactionAsync(async () => {
      if (changed) await db.runAsync('DELETE FROM chat_message');
      await writeMeta(db, CHAT_CYCLES_KEY, String(scope.cycles));
      await writeMeta(db, CHAT_NOTES_KEY, scope.includeNotes ? '1' : '0');
      await writeMeta(db, CHAT_CONSENT_KEY, '1');
    }),
  );
}
