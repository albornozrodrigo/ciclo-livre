import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { getSecuritySettings } from '@/db/security-settings-repo';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { ptBR } from '@/i18n/pt-BR';
import { SecurityProvider } from '@/security/app-lock';
import { SecuritySettings } from '@/security/security-settings';

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
jest.mock('../../modules/secure-window', () => ({ setSecureWindow: jest.fn(async () => undefined) }));

beforeEach(async () => {
  jest.clearAllMocks();
  mockLevel = 1;
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockAuth.mockResolvedValue({ success: true });
});

const ui = () => (
  <SecurityProvider>
    <SecuritySettings />
  </SecurityProvider>
);

describe('SecuritySettings', () => {
  it('sem PIN nem biometria no aparelho: explica e não oferece a trava', async () => {
    mockLevel = 0;
    await render(ui());
    expect(await screen.findByText(s.noCredential)).toBeOnTheScreen();
    expect(screen.queryByRole('switch', { name: s.lock })).toBeNull();
  });

  it('cadastrou um PIN nas configurações do Android e voltou: a opção aparece', async () => {
    mockLevel = 0;
    let listener: ((s: AppStateStatus) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, h) => {
      listener = h as (s: AppStateStatus) => void;
      return { remove: jest.fn() } as never;
    });
    await render(ui());
    await screen.findByText(s.noCredential);
    mockLevel = 1;
    await act(async () => listener?.('active'));
    expect(await screen.findByRole('switch', { name: s.lock })).toBeOnTheScreen();
  });

  it('ligar a trava pede a credencial antes e liga também esconder nos recentes', async () => {
    await render(ui());
    await fireEvent(await screen.findByRole('switch', { name: s.lock }), 'valueChange', true);
    await waitFor(async () => expect(await getSecuritySettings(mockDb)).toEqual({ lock: true, hideRecents: true }));
    expect(mockAuth).toHaveBeenCalled();
  });

  it('credencial cancelada: a trava continua desligada', async () => {
    mockAuth.mockResolvedValue({ success: false, error: 'user_cancel' });
    await render(ui());
    await fireEvent(await screen.findByRole('switch', { name: s.lock }), 'valueChange', true);
    await waitFor(() => expect(mockAuth).toHaveBeenCalled());
    expect(await getSecuritySettings(mockDb)).toEqual({ lock: false, hideRecents: false });
  });

  it('esconder nos recentes funciona sozinho', async () => {
    await render(ui());
    await fireEvent(await screen.findByRole('switch', { name: s.hideRecents }), 'valueChange', true);
    await waitFor(async () => expect((await getSecuritySettings(mockDb)).hideRecents).toBe(true));
  });
});
