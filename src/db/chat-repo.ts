import type { ChatTurn } from '@/domain/ai/chat-prompt';

import type { SqlExecutor } from './types';
import { enqueueWrite } from './write-queue';

/** Mesmo teto do CHECK da tabela. */
export const CHAT_TEXT_MAX = 4000;

export async function listChat(db: SqlExecutor): Promise<ChatTurn[]> {
  return db.getAllAsync<ChatTurn>('SELECT role, text FROM chat_message ORDER BY id');
}

/** Pergunta e resposta entram juntas (numa transação): a conversa nunca fica com pergunta sem resposta. */
export async function addChatPair(db: SqlExecutor, question: string, answer: string, now: Date = new Date()): Promise<void> {
  const q = question.trim().slice(0, CHAT_TEXT_MAX);
  const a = answer.trim().slice(0, CHAT_TEXT_MAX);
  if (!q || !a) throw new Error('Mensagem vazia.');
  const at = now.toISOString();
  await enqueueWrite(db, () =>
    db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO chat_message (role, text, created_at) VALUES (?, ?, ?)', 'user', q, at);
      await db.runAsync('INSERT INTO chat_message (role, text, created_at) VALUES (?, ?, ?)', 'assistant', a, at);
    }),
  );
}

export async function clearChat(db: SqlExecutor): Promise<void> {
  await enqueueWrite(db, () => db.runAsync('DELETE FROM chat_message'));
}
