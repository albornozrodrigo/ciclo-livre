import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { setAppLock, setHideRecents } from '@/db/security-settings-repo';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { ptBR } from '@/i18n/pt-BR';
import { AppLock, SecurityProvider } from '@/security/app-lock';
import { withLockSuppressed } from '@/security/lock-policy';

const s = ptBR.security;
let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockAuth = jest.fn();
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: (...a: unknown[]) => mockAuth(...a),
  getEnrolledLevelAsync: async () => 1,
  SecurityLevel: { NONE: 0, SECRET: 1 },
}));
const mockPrevent = jest.fn(async () => undefined);
const mockAllow = jest.fn(async () => undefined);
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: (...a: unknown[]) => mockPrevent(...(a as [])),
  allowScreenCaptureAsync: (...a: unknown[]) => mockAllow(...(a as [])),
}));

let listener: ((s: AppStateStatus) => void) | null = null;
let now = 1_000_000;

beforeEach(async () => {
  jest.clearAllMocks();
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockAuth.mockResolvedValue({ success: true });
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, h) => {
    listener = h as (s: AppStateStatus) => void;
    return { remove: jest.fn() } as never;
  });
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const app = () => (
  <SafeAreaProvider initialMetrics={metrics}>
    <SecurityProvider>
      <AppLock>
        <Text>conteúdo do ciclo</Text>
      </AppLock>
    </SecurityProvider>
  </SafeAreaProvider>
);

async function away(ms: number) {
  await act(async () => listener?.('background'));
  now += ms;
  await act(async () => listener?.('active'));
}

describe('AppLock', () => {
  it('sem trava: mostra o conteúdo e não pede nada', async () => {
    await render(app());
    expect(await screen.findByText('conteúdo do ciclo')).toBeOnTheScreen();
    await away(5 * 60_000);
    expect(screen.queryByRole('button', { name: s.unlock })).toBeNull();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('com trava: abre bloqueado, conteúdo escondido do TalkBack, e libera com a credencial do aparelho', async () => {
    await setAppLock(mockDb, true);
    mockAuth.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await render(app());
    expect(await screen.findByRole('button', { name: s.unlock })).toBeOnTheScreen();
    expect(screen.queryByText('conteúdo do ciclo')).toBeNull();
    expect(mockAuth).toHaveBeenCalledWith(expect.objectContaining({ promptMessage: s.prompt, disableDeviceFallback: false }));
    await fireEvent.press(screen.getByRole('button', { name: s.unlock }));
    expect(await screen.findByText('conteúdo do ciclo')).toBeOnTheScreen();
  });

  it('bloqueia de novo só depois de mais de 1 minuto fora, e não durante o seletor ou o compartilhar', async () => {
    await setAppLock(mockDb, true);
    await render(app());
    expect(await screen.findByText('conteúdo do ciclo')).toBeOnTheScreen();
    await away(30_000);
    expect(screen.getByText('conteúdo do ciclo')).toBeOnTheScreen();
    await act(async () => {
      await withLockSuppressed(async () => {
        listener?.('background');
        now += 5 * 60_000;
      });
      listener?.('active');
    });
    expect(screen.getByText('conteúdo do ciclo')).toBeOnTheScreen();
    mockAuth.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await away(61_000);
    expect(await screen.findByRole('button', { name: s.unlock })).toBeOnTheScreen();
  });

  it('esconder nos recentes liga e desliga o FLAG_SECURE', async () => {
    await setHideRecents(mockDb, true);
    await render(app());
    await screen.findByText('conteúdo do ciclo');
    expect(mockPrevent).toHaveBeenCalledWith('ciclo-livre');
  });
});
