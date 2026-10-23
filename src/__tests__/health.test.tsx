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
  router: { push: (href: unknown) => mockPushRoute(href), back: jest.fn(), canGoBack: () => true },
}));
const mockShow = jest.fn();
const mockPushRoute = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
let mockStatus = 'available';
const mockConnect = jest.fn();
const mockGranted = jest.fn();
const mockRead = jest.fn();
const mockOpen = jest.fn();
const mockRevoke = jest.fn(async () => undefined);
jest.mock('@/health/health-connect', () => ({
  revokeHealth: () => mockRevoke(),
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
    input: {
      weight: [{ time: '2026-10-20T13:00:00Z', value: 64.5 }],
      sleep: [{ startTime: '2026-10-20T02:00:00Z', endTime: '2026-10-20T08:30:00Z' }],
    },
    truncated: false,
  });
});

describe('Health Connect', () => {
  it('indisponível: explica, sem botão que não leva a lugar nenhum', async () => {
    mockStatus = 'unavailable';
    await render(wrap(<HealthScreen />));
    expect(await screen.findByText(h.unavailable)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: h.store })).toBeNull();
  });

  it('precisa atualizar: leva à Play Store', async () => {
    mockStatus = 'needs_update';
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(wrap(<HealthScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: h.store }));
    expect(open).toHaveBeenCalledWith('market://details?id=com.google.android.apps.healthdata');
  });

  it('conectar pede os tipos marcados, salva os concedidos e mostra o que entrou por tipo', async () => {
    mockConnect.mockResolvedValue(['weight', 'sleep']);
    await render(wrap(<HealthScreen />));
    expect(await screen.findByText(h.rules[1])).toBeOnTheScreen();
    await fireEvent(screen.getByRole('switch', { name: h.types.hrv }), 'valueChange', false);
    await fireEvent.press(screen.getByRole('button', { name: h.connect }));
    expect(mockConnect).toHaveBeenCalledWith(['sleep', 'temperature', 'resting_heart_rate', 'weight']);
    expect(await screen.findByLabelText(`${h.types.sleep}: ${h.days(1)}`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`${h.types.weight}: ${h.days(1)}`)).toBeOnTheScreen();
    expect(await getHealthSettings(mockDb)).toMatchObject({ connected: true, types: ['sleep', 'weight'] });
  });

  it('leva à política de privacidade (o que acontece com os dados do Health Connect)', async () => {
    await render(wrap(<HealthScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(ptBR.policy.link) }));
    expect(mockPushRoute).toHaveBeenCalledWith('/privacidade');
  });

  it('nenhuma permissão concedida: não conecta e explica', async () => {
    mockConnect.mockResolvedValue([]);
    await render(wrap(<HealthScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: h.connect }));
    expect(await screen.findByText(h.noneGranted)).toBeOnTheScreen();
    expect((await getHealthSettings(mockDb)).connected).toBe(false);
  });

  it('conectado: mostra só o que ainda está liberado, importa, abre o Health Connect e desconecta tirando a permissão', async () => {
    await setHealthConnected(mockDb, true);
    await render(wrap(<HealthScreen />));
    expect(await screen.findByText(h.reading(`${h.types.sleep}, ${h.types.weight}`))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: h.importNow }));
    expect(await screen.findByLabelText(`${h.types.weight}: ${h.days(1)}`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(h.openSettings) }));
    expect(mockOpen).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: h.disconnect }));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(h.disconnected));
    expect(mockRevoke).toHaveBeenCalled();
    expect((await getHealthSettings(mockDb)).connected).toBe(false);
    // Desconectado: a saída para as permissões continua à mão.
    expect(screen.getByRole('button', { name: new RegExp(h.openSettings) })).toBeOnTheScreen();
  });

  it('conectado mas sem nenhuma permissão restante: avisa e leva ao Health Connect', async () => {
    await setHealthConnected(mockDb, true);
    mockGranted.mockResolvedValue([]);
    await render(wrap(<HealthScreen />));
    expect(await screen.findByText(`Erro: ${h.noneLeft}`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: h.openSettings }));
    expect(mockOpen).toHaveBeenCalled();
  });

  it('falha ao ler: aviso com "Tentar de novo" no topo da tela', async () => {
    await setHealthConnected(mockDb, true);
    mockRead.mockRejectedValue(new Error('SecurityException'));
    await render(wrap(<HealthScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: h.importNow }));
    expect(await screen.findByText(`Erro: ${h.failed}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: h.retry })).toBeOnTheScreen();
  });
});
