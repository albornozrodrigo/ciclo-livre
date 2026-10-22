import { act, renderHook, waitFor } from '@testing-library/react-native';

import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getDay } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { useDayLog } from '@/tracking/use-day-log';

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));

const DAY = '2026-10-20';

beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
});

it('falha ao salvar uma categoria desfaz só ela, sem apagar outra edição feita ao mesmo tempo', async () => {
  const { result } = await renderHook(() => useDayLog(DAY));
  await waitFor(() => expect(result.current.day).not.toBeNull());
  // A gravação da medição falha; a da dor dá certo.
  const realRun = mockDb.runAsync;
  mockDb.runAsync = async (sql: string, ...params) => {
    if (sql.includes('log_measure')) throw new Error('disco cheio');
    return realRun(sql, ...params);
  };

  await act(async () => {
    result.current.saveMeasure('weight', 60);
    result.current.toggle('pain', 'cramps');
  });

  await waitFor(() => expect(mockShow).toHaveBeenCalled());
  expect(result.current.day?.measures).toEqual({});
  expect(result.current.day?.selections).toEqual({ pain: ['cramps'] });
  expect((await getDay(mockDb, DAY)).selections).toEqual({ pain: ['cramps'] });
});
