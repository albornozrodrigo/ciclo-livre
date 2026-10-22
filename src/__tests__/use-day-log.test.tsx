import { act, renderHook, waitFor } from '@testing-library/react-native';

import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getDay, setSelection } from '@/db/log-repo';
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

it('ao trocar de data não mostra o dia anterior enquanto carrega o novo', async () => {
  await setSelection(mockDb, DAY, 'pain', ['cramps']);
  const { result, rerender } = await renderHook(({ date }: { date: string }) => useDayLog(date), { initialProps: { date: DAY } });
  await waitFor(() => expect(result.current.day?.selections.pain).toEqual(['cramps']));
  // Segura o carregamento do novo dia para observar o meio do caminho.
  let release: () => void = () => {};
  const realAll = mockDb.getAllAsync;
  mockDb.getAllAsync = async <T,>(sql: string, ...params: (string | number | null)[]) => {
    await new Promise<void>((r) => (release = r));
    return realAll<T>(sql, ...params);
  };

  await rerender({ date: '2026-10-21' });

  expect(result.current.day).toBeNull();
  mockDb.getAllAsync = realAll;
  await act(async () => release());
});

it('falha de um salvamento antigo não desfaz um mais novo que deu certo', async () => {
  const { result } = await renderHook(() => useDayLog(DAY));
  await waitFor(() => expect(result.current.day).not.toBeNull());
  const realRun = mockDb.runAsync;
  let calls = 0;
  mockDb.runAsync = async (sql: string, ...params) => {
    // Só a primeira gravação da dor falha.
    if (sql.startsWith('DELETE FROM log_selection') && calls++ === 0) throw new Error('falhou');
    return realRun(sql, ...params);
  };

  // Dois toques seguidos, antes de qualquer gravação terminar.
  await act(async () => {
    result.current.toggle('pain', 'cramps');
    result.current.toggle('pain', 'back');
  });

  await waitFor(async () => expect((await getDay(mockDb, DAY)).selections.pain).toEqual(['cramps', 'back']));
  expect(result.current.day?.selections.pain).toEqual(['cramps', 'back']);
});
