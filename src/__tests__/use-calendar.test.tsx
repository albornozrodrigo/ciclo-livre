import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCalendar } from '@/cycle/use-calendar';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
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
};

beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
});

it('ao trocar de mês não devolve a grade do mês anterior enquanto o novo carrega', async () => {
  const { result, rerender } = await renderHook(({ month }: { month: number }) => useCalendar(profile, 2026, month), {
    initialProps: { month: 10 },
  });
  await waitFor(() => expect(result.current).not.toBeNull());
  let release: () => void = () => {};
  const realAll = mockDb.getAllAsync;
  mockDb.getAllAsync = async <T,>(sql: string, ...params: (string | number | null)[]) => {
    await new Promise<void>((r) => (release = r));
    return realAll<T>(sql, ...params);
  };

  await rerender({ month: 11 });

  expect(result.current).toBeNull();
  mockDb.getAllAsync = realAll;
  await act(async () => release());
  await waitFor(() => expect(result.current?.flat().some((c) => c.date === '2026-11-15')).toBe(true));
});
