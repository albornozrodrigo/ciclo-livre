import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { getDiscreet, listReminders, saveReminder, setDiscreet } from '@/db/reminder-repo';
import { defaultReminder, REMINDER_KINDS } from '@/domain/reminders/catalog';

import { openMemoryDatabase } from './node-sqlite-adapter';

async function migratedDb() {
  const db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  return db;
}

describe('reminder-repo', () => {
  it('sem nada salvo, todos os tipos com o padrão (desligados)', async () => {
    const db = await migratedDb();
    const list = await listReminders(db);
    expect(list.map((r) => r.kind)).toEqual([...REMINDER_KINDS]);
    expect(list.every((r) => !r.enabled)).toBe(true);
  });

  it('salva e relê (upsert), com opções e mensagem', async () => {
    const db = await migratedDb();
    const r = {
      ...defaultReminder('daily_log'),
      enabled: true,
      time: '20:30',
      options: {
        ...defaultReminder('daily_log').options,
        frequency: 'weekly' as const,
        anchor: '2026-10-20',
      },
      title: 'Diário',
      body: null,
    };
    await saveReminder(db, r);
    await saveReminder(db, { ...r, time: '21:00' });
    expect((await listReminders(db)).find((x) => x.kind === 'daily_log')).toEqual({ ...r, time: '21:00' });
  });

  it('recusa horário, opções ou mensagem inválidos', async () => {
    const db = await migratedDb();
    await expect(saveReminder(db, { ...defaultReminder('period_due'), time: '25:00' })).rejects.toThrow('Horário inválido');
    await expect(
      saveReminder(db, {
        ...defaultReminder('period_due'),
        title: 'x'.repeat(41),
      }),
    ).rejects.toThrow('Mensagem inválida');
    await expect(
      saveReminder(db, {
        ...defaultReminder('period_due'),
        options: { ...defaultReminder('period_due').options, daysBefore: 30 },
      }),
    ).rejects.toThrow('Opções inválidas');
  });

  it('modo discreto: ligado por padrão (texto de saúde só se a pessoa escolher), salva e relê', async () => {
    const db = await migratedDb();
    expect(await getDiscreet(db)).toBe(true);
    await setDiscreet(db, false);
    expect(await getDiscreet(db)).toBe(false);
    await setDiscreet(db, true);
    expect(await getDiscreet(db)).toBe(true);
  });
});
