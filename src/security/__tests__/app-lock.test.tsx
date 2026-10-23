import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { getSecuritySettings, setAppLock, setHideRecents } from '@/db/security-settings-repo';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { ptBR } from '@/i18n/pt-BR';
import { AppLock, SecurityProvider } from '@/security/app-lock';
import { isAppLocked, withLockSuppressed } from '@/security/lock-policy';

const s = ptBR.security;
let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockAuth = jest.fn();
let mockLevel = 1;
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: (...a: unknown[]) => mockAuth(...a),
  getEnrolledLevelAsync: async () => mockLevel,
  SecurityLevel: { NONE: 0, SECRET: 1 },
}));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
const mockSecure = jest.fn(async (_on: boolean) => undefined);
jest.mock('../../../modules/secure-window', () => ({ setSecureWindow: (on: boolean) => mockSecure(on) }));

let listener: ((s: AppStateStatus) => void) | null = null;
let now = 1_000_000;

beforeEach(async () => {
  jest.clearAllMocks();
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockAuth.mockResolvedValue({ success: true });
  mockLevel = 1;
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

  it('ao sair, cobre o conteúdo na hora (nada aparece por um instante ao voltar); voltar logo descobre sem pedir nada', async () => {
    await setAppLock(mockDb, true);
    await render(app());
    await screen.findByText('conteúdo do ciclo');
    await act(async () => listener?.('background'));
    expect(screen.queryByText('conteúdo do ciclo')).toBeNull();
    now += 10_000;
    await act(async () => listener?.('active'));
    expect(screen.getByText('conteúdo do ciclo')).toBeOnTheScreen();
    expect(mockAuth).toHaveBeenCalledTimes(1);
  });

  it('saída longa pela tela de compartilhar bloqueia ao voltar', async () => {
    await setAppLock(mockDb, true);
    await render(app());
    await screen.findByText('conteúdo do ciclo');
    mockAuth.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await act(async () => {
      await withLockSuppressed(async () => {
        listener?.('background');
        now += 3 * 60 * 60_000;
      });
      listener?.('active');
    });
    expect(await screen.findByRole('button', { name: s.unlock })).toBeOnTheScreen();
    expect(isAppLocked()).toBe(true);
  });

  it('o celular não tem mais PIN nem biometria: desliga a trava e libera, em vez de trancar para sempre', async () => {
    await setAppLock(mockDb, true);
    mockLevel = 0;
    mockAuth.mockResolvedValue({ success: false, error: 'not_enrolled' });
    await render(app());
    expect(await screen.findByText('conteúdo do ciclo')).toBeOnTheScreen();
    expect(mockShow).toHaveBeenCalledWith(s.lockRemoved);
    expect((await getSecuritySettings(mockDb)).lock).toBe(false);
    expect(isAppLocked()).toBe(false);
  });

  it('falha ao desbloquear (ex.: muitas tentativas): explica e mantém o botão', async () => {
    await setAppLock(mockDb, true);
    mockAuth.mockResolvedValue({ success: false, error: 'lockout' });
    await render(app());
    expect(await screen.findByText(s.unlockFailed)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: s.unlock })).toBeOnTheScreen();
  });

  it('esconder nos recentes liga e desliga o FLAG_SECURE', async () => {
    await setHideRecents(mockDb, true);
    await render(app());
    await screen.findByText('conteúdo do ciclo');
    expect(mockSecure).toHaveBeenLastCalledWith(true);
  });
});
