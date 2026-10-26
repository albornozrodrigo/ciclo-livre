import { renderHook, waitFor } from '@testing-library/react-native';

import { useCalendarData } from '@/cycle/use-calendar';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import type { Profile } from '@/domain/profile';

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const profile: Profile = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: '2026-10-10',
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: false,
  finalPeriod: null,
};

beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
});

it('lê de uma vez os dias com registro e o primeiro deles, para a lista inteira de meses', async () => {
  await setSelection(mockDb, '2026-10-12', 'period', ['medium']);
  await setSelection(mockDb, '2019-03-08', 'period', ['light']);

  const { result } = await renderHook(() => useCalendarData(profile));

  await waitFor(() => expect(result.current).not.toBeNull());
  expect(result.current?.firstLogged).toBe('2019-03-08');
  expect(result.current?.logged.has('2026-10-12')).toBe(true);
});

it('sem perfil, não há dados', async () => {
  const { result } = await renderHook(() => useCalendarData(null));
  expect(result.current).toBeNull();
});
