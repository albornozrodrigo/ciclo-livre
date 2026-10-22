import { getAiSettings, setAiConsent, setAiModel } from '@/db/ai-settings-repo';
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
});
