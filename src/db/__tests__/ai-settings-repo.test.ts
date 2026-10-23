import {
  acceptChatConsent,
  getAiSettings,
  getChatSettings,
  revokeChatConsent,
  setAiConsent,
  setAiModel,
  setChatConsent,
  setChatScope,
} from '@/db/ai-settings-repo';
import { addChatPair, listChat } from '@/db/chat-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';

import { openMemoryDatabase } from './node-sqlite-adapter';

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('ai-settings-repo', () => {
  it('padrão: sem consentimento, modelo Opus 5.5', async () => {
    expect(await getAiSettings(await migratedDb())).toEqual({ consent: false, model: 'claude-opus-5-5' });
  });

  it('salva consentimento (e revoga) e modelo; modelo desconhecido é recusado', async () => {
    const db = await migratedDb();
    await setAiConsent(db, true);
    await setAiModel(db, 'claude-haiku-5-5');
    expect(await getAiSettings(db)).toEqual({ consent: true, model: 'claude-haiku-5-5' });
    await setAiConsent(db, false);
    expect((await getAiSettings(db)).consent).toBe(false);
    await expect(setAiModel(db, 'gpt-5' as never)).rejects.toThrow('Modelo inválido');
  });

  it('chat: consentimento próprio (independe do resumo de artigos) e escopo com padrão 6 ciclos, sem notas', async () => {
    const db = await migratedDb();
    expect(await getChatSettings(db)).toEqual({ consent: false, cycles: 6, includeNotes: false });
    await setAiConsent(db, true);
    expect((await getChatSettings(db)).consent).toBe(false);
    await setChatConsent(db, true);
    await setChatScope(db, { cycles: 12, includeNotes: true });
    expect(await getChatSettings(db)).toEqual({ consent: true, cycles: 12, includeNotes: true });
    await setChatConsent(db, false);
    expect((await getAiSettings(db)).consent).toBe(true);
    await expect(setChatScope(db, { cycles: 7 as never, includeNotes: false })).rejects.toThrow();
  });

  it('revogar o consentimento do chat apaga a conversa (respostas antigas não voltam a sair sob outro consentimento)', async () => {
    const db = await migratedDb();
    await acceptChatConsent(db, { cycles: 6, includeNotes: true });
    await addChatPair(db, 'o que dizem minhas notas?', 'Suas notas citam cólica.');
    await revokeChatConsent(db);
    expect((await getChatSettings(db)).consent).toBe(false);
    expect(await listChat(db)).toEqual([]);
  });

  it('concordar com escopo diferente do anterior apaga a conversa; com o mesmo escopo, mantém', async () => {
    const db = await migratedDb();
    await acceptChatConsent(db, { cycles: 6, includeNotes: true });
    await addChatPair(db, 'p', 'r');
    await acceptChatConsent(db, { cycles: 6, includeNotes: true });
    expect(await listChat(db)).toHaveLength(2);
    await acceptChatConsent(db, { cycles: 6, includeNotes: false });
    expect(await listChat(db)).toEqual([]);
    expect(await getChatSettings(db)).toEqual({ consent: true, cycles: 6, includeNotes: false });
  });
});
