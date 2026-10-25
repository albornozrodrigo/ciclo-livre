import { addChatPair, CHAT_TEXT_MAX, clearChat, listChat } from '@/db/chat-repo';
import { exportAll, importAll } from '@/db/export-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';

import { openMemoryDatabase } from './node-sqlite-adapter';

const NOW = new Date('2026-10-23T12:00:00Z');

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('chat-repo', () => {
  it('guarda pergunta e resposta juntas, em ordem', async () => {
    const db = await migratedDb();
    await addChatPair(db, 'Meus ciclos são regulares?', 'Sim, variam pouco.', NOW);
    await addChatPair(db, 'E a menstruação?', 'Dura 5 dias em média.', NOW);
    expect(await listChat(db)).toEqual([
      { role: 'user', text: 'Meus ciclos são regulares?' },
      { role: 'assistant', text: 'Sim, variam pouco.' },
      { role: 'user', text: 'E a menstruação?' },
      { role: 'assistant', text: 'Dura 5 dias em média.' },
    ]);
  });

  it('texto longo é cortado no limite; vazio é recusado', async () => {
    const db = await migratedDb();
    await addChatPair(db, 'p', 'r'.repeat(CHAT_TEXT_MAX + 100), NOW);
    expect((await listChat(db))[1].text).toHaveLength(CHAT_TEXT_MAX);
    await expect(addChatPair(db, '   ', 'r', NOW)).rejects.toThrow();
  });

  it('apagar conversa remove tudo', async () => {
    const db = await migratedDb();
    await addChatPair(db, 'p', 'r', NOW);
    await clearChat(db);
    expect(await listChat(db)).toEqual([]);
  });

  it('a conversa não entra na exportação, e restaurar um backup apaga a conversa (ela citaria dados que mudaram)', async () => {
    const db = await migratedDb();
    await saveProfile(
      db,
      {
        birthYear: 1995,
        mode: 'period',
        lastPeriodStart: '2026-10-12',
        periodLength: 5,
        cycleLength: 28,
        regularity: 'regular',
        dueDate: null,
        tryingSince: null,
        birthControl: null,
        lutealLength: null,
        includeAtypical: false,
      },
      NOW,
    );
    await addChatPair(db, 'pergunta secreta', 'resposta', NOW);
    const data = await exportAll(db, NOW);
    expect(JSON.stringify(data)).not.toContain('pergunta secreta');
    await importAll(db, JSON.parse(JSON.stringify(data)));
    expect(await listChat(db)).toEqual([]);
  });
});
