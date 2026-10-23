import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { HealthBridge } from '@/health/health-bridge';

const mockImport = jest.fn(async (..._a: unknown[]) => ({ added: {}, kept: 0, dropped: 0 }));
let mockAuto = true;
jest.mock('@/health/import-health', () => ({
  importFromHealthConnect: (...a: unknown[]) => mockImport(...a),
  shouldAutoImport: () => mockAuto,
}));
let mockStatus = 'available';
jest.mock('@/health/health-connect', () => ({ healthStatus: async () => mockStatus }));
jest.mock('@/db/health-settings-repo', () => ({ getHealthSettings: async () => ({ connected: true, types: [], lastImport: null }) }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
const mockLog = jest.fn();
jest.mock('@/lib/logger', () => ({ log: { error: (...a: unknown[]) => mockLog(...a) } }));

let listener: ((s: AppStateStatus) => void) | null = null;
beforeEach(() => {
  jest.clearAllMocks();
  mockAuto = true;
  mockStatus = 'available';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    listener = handler as (s: AppStateStatus) => void;
    return { remove: jest.fn() } as never;
  });
});

describe('HealthBridge', () => {
  it('importa ao abrir e ao voltar ao app quando está na hora', async () => {
    await render(<HealthBridge />);
    await act(async () => listener?.('active'));
    expect(mockImport).toHaveBeenCalledTimes(2);
  });

  it('não importa fora da hora, sem Health Connect ou ao sair do app', async () => {
    mockAuto = false;
    await render(<HealthBridge />);
    mockAuto = true;
    mockStatus = 'unavailable';
    await act(async () => listener?.('active'));
    mockStatus = 'available';
    await act(async () => listener?.('background'));
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('falha no import vai para o log sem derrubar o app', async () => {
    mockImport.mockRejectedValueOnce(new Error('SecurityException'));
    await render(<HealthBridge />);
    await act(async () => undefined);
    expect(mockLog).toHaveBeenCalledWith('health_auto_import_failed', expect.any(Error));
  });
});
