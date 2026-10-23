import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HealthScreen from '@/app/health';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getHealthSettings, setHealthConnected } from '@/db/health-settings-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { ptBR } from '@/i18n/pt-BR';

const h = ptBR.health;
let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
let mockStatus = 'available';
const mockConnect = jest.fn();
const mockGranted = jest.fn();
const mockRead = jest.fn();
const mockOpen = jest.fn();
jest.mock('@/health/health-connect', () => ({
  healthStatus: async () => mockStatus,
  connectHealth: (...a: unknown[]) => mockConnect(...a),
  grantedHealthTypes: () => mockGranted(),
  readHealth: (...a: unknown[]) => mockRead(...a),
  openHealthSettings: () => mockOpen(),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

beforeEach(async () => {
  jest.clearAllMocks();
  mockStatus = 'available';
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockGranted.mockResolvedValue(['weight', 'sleep']);
  mockRead.mockResolvedValue({
    weight: [{ time: '2026-10-20T13:00:00Z', value: 64.5 }],
    sleep: [{ startTime: '2026-10-20T02:00:00Z', endTime: '2026-10-20T08:30:00Z' }],
  });
});

describe('Health Connect', () => {
  it('indisponível: explica e oferece a Play Store', async () => {
    mockStatus = 'unavailable';
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(wrap(<HealthScreen />));
    expect(await screen.findByText(h.unavailable)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: h.store }));
    expect(open).toHaveBeenCalledWith('market://details?id=com.google.android.apps.healthdata');
  });

  it('conectar pede os tipos marcados, salva os concedidos e importa na hora', async () => {
    mockConnect.mockResolvedValue(['weight', 'sleep']);
    await render(wrap(<HealthScreen />));
    expect(await screen.findByText(h.rules[1])).toBeOnTheScreen();
    await fireEvent(screen.getByRole('switch', { name: h.types.hrv }), 'valueChange', false);
    await fireEvent.press(screen.getByRole('button', { name: h.connect }));
    expect(mockConnect).toHaveBeenCalledWith(['sleep', 'temperature', 'resting_heart_rate', 'weight']);
    expect(await screen.findByText(h.added(`${h.types.sleep} (1 dia), ${h.types.weight} (1 dia)`))).toBeOnTheScreen();
    expect(await getHealthSettings(mockDb)).toMatchObject({ connected: true, types: ['sleep', 'weight'] });
  });

  it('nenhuma permissão concedida: não conecta e explica', async () => {
    mockConnect.mockResolvedValue([]);
    await render(wrap(<HealthScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: h.connect }));
    expect(await screen.findByText(h.noneGranted)).toBeOnTheScreen();
    expect((await getHealthSettings(mockDb)).connected).toBe(false);
  });

  it('conectado: importar agora, abrir o Health Connect e desconectar', async () => {
    await setHealthConnected(mockDb, true);
    await render(wrap(<HealthScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: h.importNow }));
    expect(await screen.findByText(h.added(`${h.types.sleep} (1 dia), ${h.types.weight} (1 dia)`))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: h.openSettings }));
    expect(mockOpen).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: h.disconnect }));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(h.disconnected));
    expect((await getHealthSettings(mockDb)).connected).toBe(false);
  });

  it('falha ao ler: aviso com "Tentar de novo"', async () => {
    await setHealthConnected(mockDb, true);
    mockRead.mockRejectedValue(new Error('SecurityException'));
    await render(wrap(<HealthScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: h.importNow }));
    expect(await screen.findByText(`Erro: ${h.failed}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: h.retry })).toBeOnTheScreen();
  });
});
