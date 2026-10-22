import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HojeScreen from '@/app/(tabs)/index';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { todayIso } from '@/domain/dates';
import { ptBR } from '@/i18n/pt-BR';

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (href: unknown) => mockPush(href) },
  // Na tela real roda ao ganhar foco; no teste, ao montar.
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const renderHoje = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HojeScreen />
    </SafeAreaProvider>,
  );

beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockPush.mockReset();
});

describe('Hoje', () => {
  it('"Registrar hoje" abre o registro da data de hoje', async () => {
    await renderHoje();

    await fireEvent.press(await screen.findByRole('button', { name: ptBR.today.logToday }));

    expect(mockPush).toHaveBeenCalledWith(`/registro/${todayIso()}`);
  });

  it('sem registros mostra o estado vazio', async () => {
    await renderHoje();

    expect(await screen.findByText(ptBR.today.empty)).toBeOnTheScreen();
  });

  it('com registros mostra quantas categorias e quais, agrupadas', async () => {
    await setSelection(mockDb, todayIso(), 'pain', ['cramps', 'headache']);
    await setSelection(mockDb, todayIso(), 'energy', ['low']);

    await renderHoje();

    expect(await screen.findByText(ptBR.today.count(2))).toBeOnTheScreen();
    expect(screen.getByText(/Dor: Cólica, Dor de cabeça/)).toBeOnTheScreen();
  });

  it('a nota não conta como categoria', async () => {
    const { setNote } = jest.requireActual('@/db/log-repo');
    await setNote(mockDb, todayIso(), 'só uma nota');

    await renderHoje();

    expect(await screen.findByText(ptBR.today.noteOnly)).toBeOnTheScreen();
  });
});
