import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { exportAll } from '@/db/export-repo';
import { getHealthSettings, markHealthImported, setHealthConnected, setHealthTypes } from '@/db/health-settings-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { connectHealth, healthStatus } from '@/health/health-connect';
import { importFromHealthConnect, shouldAutoImport } from '@/health/import-health';

const mockRead = jest.fn();
const mockGranted = jest.fn();
const mockRequest = jest.fn();
let mockSdk = 3;
jest.mock('react-native-health-connect', () => ({
  SdkAvailabilityStatus: { SDK_UNAVAILABLE: 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2, SDK_AVAILABLE: 3 },
  getSdkStatus: async () => mockSdk,
  initialize: async () => true,
  requestPermission: (...a: unknown[]) => mockRequest(...a),
  getGrantedPermissions: () => mockGranted(),
  readRecords: (...a: unknown[]) => mockRead(...a),
  openHealthConnectSettings: jest.fn(),
}));

const NOW = new Date('2026-10-23T12:00:00Z');
const perm = (recordType: string) => ({ accessType: 'read', recordType });
let db: ReturnType<typeof openMemoryDatabase>;

beforeEach(async () => {
  jest.clearAllMocks();
  mockSdk = 3;
  db = openMemoryDatabase();
  await runMigrations(db, MIGRATIONS);
  mockGranted.mockResolvedValue([perm('Weight'), perm('SleepSession')]);
  mockRead.mockImplementation(async (type: string) => {
    if (type === 'Weight')
      return {
        records: [{ time: '2026-10-20T10:00:00Z', weight: { inKilograms: 64.5 }, zoneOffset: { id: '-03:00', totalSeconds: -10800 } }],
      };
    if (type === 'SleepSession') return { records: [{ startTime: '2026-10-20T02:00:00Z', endTime: '2026-10-20T08:30:00Z' }] };
    return { records: [] };
  });
});

describe('healthStatus', () => {
  it('traduz o estado do SDK', async () => {
    expect(await healthStatus()).toBe('available');
    mockSdk = 2;
    expect(await healthStatus()).toBe('needs_update');
    mockSdk = 1;
    expect(await healthStatus()).toBe('unavailable');
  });
});

describe('connectHealth', () => {
  it('pede só leitura dos tipos escolhidos e devolve os concedidos', async () => {
    mockRequest.mockResolvedValue([perm('Weight')]);
    expect(await connectHealth(['weight', 'sleep'])).toEqual(['weight']);
    expect(mockRequest).toHaveBeenCalledWith([perm('SleepSession'), perm('Weight')]);
  });
});

describe('importFromHealthConnect', () => {
  it('desconectado: não lê nada', async () => {
    expect(await importFromHealthConnect(db, NOW)).toBeNull();
    expect(mockRead).not.toHaveBeenCalled();
  });

  it('lê só os tipos escolhidos E concedidos, dos últimos 30 dias, grava e marca o import', async () => {
    await setHealthConnected(db, true);
    await setHealthTypes(db, ['weight', 'sleep', 'hrv']);
    const result = await importFromHealthConnect(db, NOW);
    expect(result).toEqual({ added: { sleep: 1, weight: 1 }, kept: 0, dropped: 0 });
    const types = mockRead.mock.calls.map((c) => c[0]).sort();
    expect(types).toEqual(['SleepSession', 'Weight']);
    expect(mockRead.mock.calls[0][1].timeRangeFilter).toEqual({
      operator: 'between',
      startTime: '2026-09-23T12:00:00.000Z',
      endTime: NOW.toISOString(),
    });
    const data = await exportAll(db, NOW);
    expect(data.measures).toEqual([{ date: '2026-10-20', category: 'weight', value: 64.5 }]);
    expect((await getHealthSettings(db)).lastImport).toBe(NOW.toISOString());
  });

  it('duas chamadas ao mesmo tempo (tela e abertura do app) fazem uma leitura só', async () => {
    await setHealthConnected(db, true);
    const [a, b] = await Promise.all([importFromHealthConnect(db, NOW), importFromHealthConnect(db, NOW)]);
    expect(mockRead).toHaveBeenCalledTimes(2);
    expect(a).toEqual(b);
    expect(a?.added).toEqual({ sleep: 1, weight: 1 });
  });

  it('depois do primeiro, lê desde o último import com 2 dias de folga', async () => {
    await setHealthConnected(db, true);
    await markHealthImported(db, new Date('2026-10-22T12:00:00Z'));
    await importFromHealthConnect(db, NOW);
    expect(mockRead.mock.calls[0][1].timeRangeFilter.startTime).toBe('2026-10-20T12:00:00.000Z');
  });

  it('segue as páginas', async () => {
    await setHealthConnected(db, true);
    await setHealthTypes(db, ['weight']);
    mockGranted.mockResolvedValue([perm('Weight')]);
    mockRead
      .mockResolvedValueOnce({ records: [{ time: '2026-10-20T10:00:00Z', weight: { inKilograms: 64 } }], pageToken: 'p2' })
      .mockResolvedValueOnce({ records: [{ time: '2026-10-21T10:00:00Z', weight: { inKilograms: 65 } }] });
    expect((await importFromHealthConnect(db, NOW))?.added).toEqual({ weight: 2 });
    expect(mockRead.mock.calls[1][1].pageToken).toBe('p2');
  });
});

describe('shouldAutoImport', () => {
  it('só com conexão ativa e último import há mais de 6 horas', () => {
    const base = { connected: true, types: [], lastImport: null };
    expect(shouldAutoImport({ ...base, connected: false }, NOW)).toBe(false);
    expect(shouldAutoImport(base, NOW)).toBe(true);
    expect(shouldAutoImport({ ...base, lastImport: '2026-10-23T08:00:00Z' }, NOW)).toBe(false);
    expect(shouldAutoImport({ ...base, lastImport: '2026-10-23T05:00:00Z' }, NOW)).toBe(true);
  });
});
