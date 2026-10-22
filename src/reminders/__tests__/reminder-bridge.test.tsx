import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { ReminderBridge } from '@/reminders/reminder-bridge';

const mockSync = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('@/reminders/sync', () => ({
  syncReminders: (...args: unknown[]) => mockSync(...args),
}));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({
    state: { status: 'ready', profile: { mode: 'period' } },
  }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (href: unknown) => mockPush(href) },
}));
let mockResponse: unknown = null;
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  useLastNotificationResponse: () => mockResponse,
}));

let listener: ((s: AppStateStatus) => void) | null = null;
beforeEach(() => {
  mockSync.mockClear();
  mockPush.mockClear();
  mockResponse = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    listener = handler as (s: AppStateStatus) => void;
    return { remove: jest.fn() } as never;
  });
});

describe('ReminderBridge', () => {
  it('reagenda ao montar, ao voltar ao app e ao sair dele (registros novos mudam a previsão)', async () => {
    await render(<ReminderBridge />);
    expect(mockSync).toHaveBeenCalledTimes(1);
    await act(async () => listener?.('background'));
    await act(async () => listener?.('active'));
    expect(mockSync).toHaveBeenCalledTimes(3);
  });

  it('tocar no lembrete de registro abre o registro do dia do lembrete', async () => {
    mockResponse = { actionIdentifier: 'default', notification: { request: { identifier: 'daily_log:2026-10-21@20:00#a', content: { data: { kind: 'daily_log', date: '2026-10-21' } } } } };
    await render(<ReminderBridge />);
    expect(mockPush).toHaveBeenCalledWith('/registro/2026-10-21');
  });

  it('o mesmo toque não navega de novo quando a ponte remonta (ex.: depois de refazer o cadastro)', async () => {
    mockResponse = { actionIdentifier: 'default', notification: { request: { identifier: 'daily_log:2026-10-20@20:00#b', content: { data: { kind: 'daily_log', date: '2026-10-20' } } } } };
    const first = await render(<ReminderBridge />);
    await first.unmount();
    await render(<ReminderBridge />);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('data inválida nos dados é ignorada', async () => {
    mockResponse = { actionIdentifier: 'default', notification: { request: { identifier: 'x', content: { data: { kind: 'daily_log', date: '../perfil' } } } } };
    await render(<ReminderBridge />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('outros lembretes só abrem o app', async () => {
    mockResponse = {
      actionIdentifier: 'default',
      notification: {
        request: {
          identifier: 'period_due:2026-10-24',
          content: { data: { kind: 'period_due' } },
        },
      },
    };
    await render(<ReminderBridge />);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
