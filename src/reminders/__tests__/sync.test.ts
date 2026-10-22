import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveReminder, setDiscreet } from '@/db/reminder-repo';
import type { Profile } from '@/domain/profile';
import { defaultReminder } from '@/domain/reminders/catalog';
import { cancelAllReminders, CHANNELS, requestReminderPermission, syncReminders } from '@/reminders/sync';

type Request = { identifier: string; content: { title: string; body: string; data: Record<string, unknown> }; trigger: { date: Date; channelId: string } };
const mockStore = new Map<string, Request>();
const mockCalls: string[] = [];
let mockGranted = true;
const mockChannels = new Map<string, { lockscreenVisibility: number }>();
let mockScheduleGate: Promise<void> | null = null;

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 2, SECRET: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockStore.values()].map((r) => ({ identifier: r.identifier }))),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockCalls.push('cancelAll');
    mockStore.clear();
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockCalls.push(`cancel ${id}`);
    mockStore.delete(id);
  }),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockGranted })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockGranted, canAskAgain: false })),
  setNotificationChannelAsync: jest.fn(async (id: string, channel: { lockscreenVisibility: number }) => {
    mockCalls.push(`channel ${id}`);
    mockChannels.set(id, channel);
  }),
  deleteNotificationChannelAsync: jest.fn(async (id: string) => {
    mockCalls.push(`deleteChannel ${id}`);
  }),
  scheduleNotificationAsync: jest.fn(async (request: Request) => {
    if (mockScheduleGate) await mockScheduleGate;
    mockCalls.push('schedule');
    mockStore.set(request.identifier, request);
    return request.identifier;
  }),
}));

const profile: Profile = {
  birthYear: 1995, mode: 'period', lastPeriodStart: null, periodLength: 5, cycleLength: 28,
  regularity: 'unknown', dueDate: null, tryingSince: null, birthControl: null,
};
// 22/10/2026, 8h local.
const NOW = new Date(2026, 9, 22, 8, 0);
const scheduled = () => [...mockStore.values()];

let db: ReturnType<typeof openMemoryDatabase>;
beforeEach(async () => {
  mockStore.clear();
  mockCalls.length = 0;
  mockChannels.clear();
  mockGranted = true;
  mockScheduleGate = null;
  db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  for (const d of ['2026-09-26', '2026-09-27', '2026-09-28']) await setSelection(db, d, 'period', ['medium']);
  await saveReminder(db, { ...defaultReminder('period_due'), enabled: true });
});

describe('syncReminders', () => {
  it('agenda a agenda calculada na hora local, com o texto padrão', async () => {
    await syncReminders(db, profile, NOW);

    const first = scheduled()[0];
    expect(first.identifier).toMatch(/^period_due:2026-10-24@09:00#/);
    expect(first.trigger).toEqual({ type: 'date', date: new Date(2026, 9, 24, 9, 0), channelId: CHANNELS.private });
    expect(first.content).toMatchObject({ title: 'Menstruação prevista para hoje' });
  });

  it('texto de saúde nunca aparece na tela de bloqueio: canal SECRET; o canal antigo é removido', async () => {
    await syncReminders(db, profile, NOW);
    expect(mockChannels.get(CHANNELS.private)?.lockscreenVisibility).toBe(3);
    expect(mockCalls).toContain('deleteChannel lembretes');
  });

  it('modo discreto: texto neutro num canal que pode aparecer na tela de bloqueio', async () => {
    await setDiscreet(db, true);
    await syncReminders(db, profile, NOW);
    expect(scheduled()[0].content).toMatchObject({ title: 'Ciclo Livre', body: 'Você tem um lembrete.' });
    expect(scheduled()[0].trigger.channelId).toBe(CHANNELS.discreet);
    expect(mockChannels.get(CHANNELS.discreet)?.lockscreenVisibility).toBe(1);
  });

  it('sem mudança, não cancela nem reagenda nada (abrir e sair do app é barato e seguro)', async () => {
    await syncReminders(db, profile, NOW);
    mockCalls.length = 0;
    await syncReminders(db, profile, NOW);
    expect(mockCalls.filter((c) => c === 'schedule' || c.startsWith('cancel'))).toEqual([]);
  });

  it('mudou o texto: troca só o que mudou', async () => {
    await syncReminders(db, profile, NOW);
    const before = scheduled().map((r) => r.identifier);
    await setDiscreet(db, true);
    await syncReminders(db, profile, NOW);
    expect(scheduled().map((r) => r.identifier)).not.toEqual(before);
    expect(scheduled()).toHaveLength(before.length);
  });

  it('o lembrete de registro leva a data do dia (abre o registro certo)', async () => {
    await saveReminder(db, { ...defaultReminder('daily_log'), enabled: true, options: { ...defaultReminder('daily_log').options, anchor: '2026-10-22' } });
    await syncReminders(db, profile, NOW);
    const log = scheduled().find((r) => r.identifier.startsWith('daily_log:2026-10-22'));
    expect(log?.content.data).toEqual({ kind: 'daily_log', date: '2026-10-22' });
  });

  it('sem permissão ou sem perfil, cancela o que havia', async () => {
    await syncReminders(db, profile, NOW);
    mockGranted = false;
    await syncReminders(db, profile, NOW);
    expect(scheduled()).toEqual([]);
    mockGranted = true;
    await syncReminders(db, profile, NOW);
    await syncReminders(db, null, NOW);
    expect(scheduled()).toEqual([]);
  });

  it('"apagar tudo" no meio de um reagendamento: nada volta a ser agendado', async () => {
    await saveReminder(db, { ...defaultReminder('daily_log'), enabled: true });
    let release: () => void = () => undefined;
    mockScheduleGate = new Promise((resolve) => {
      release = resolve;
    });
    const running = syncReminders(db, profile, NOW);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const erasing = cancelAllReminders();
    release();
    mockScheduleGate = null;
    await Promise.all([running, erasing]);
    expect(scheduled()).toEqual([]);
  });
});

describe('requestReminderPermission', () => {
  it('cria o canal antes de pedir (no Android 13 o pedido só aparece com canal)', async () => {
    expect(await requestReminderPermission()).toEqual({ granted: true, canAskAgain: false });
    expect(mockCalls[0]).toMatch(/^channel /);
  });
});
