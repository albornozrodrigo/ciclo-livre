import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HojeScreen from '@/app/(tabs)/index';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { addDays, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
let mockProfile: Profile;
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({ state: { status: 'ready', profile: mockProfile } }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { push: (href: unknown) => mockPush(href) },
  // Na tela real roda ao ganhar foco; no teste, ao montar.
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};
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
  mockProfile = {
    birthYear: 1995,
    mode: 'period',
    lastPeriodStart: null,
    periodLength: 5,
    cycleLength: 28,
    regularity: 'unknown',
    dueDate: null,
    tryingSince: null,
    birthControl: null,
  };
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

describe('Hoje › ciclo', () => {
  const c = ptBR.cycle;
  /** Três menstruações de 2 dias, ciclos de 28; hoje é o dia 27 do ciclo atual. */
  async function seedCycles() {
    const today = todayIso();
    for (const offset of [-82, -81, -54, -53, -26, -25]) {
      await setSelection(mockDb, addDays(today, offset), 'period', ['medium']);
    }
  }

  it('mostra a fase de hoje escrita, o dia do ciclo e a próxima menstruação', async () => {
    await seedCycles();

    await renderHoje();

    expect(await screen.findByText(c.phases.luteal)).toBeOnTheScreen();
    expect(screen.getByText(c.dayOfCycle(27))).toBeOnTheScreen();
    expect(screen.getByText(c.nextIn(2))).toBeOnTheScreen();
    expect(screen.getByText(c.disclaimer)).toBeOnTheScreen();
  });

  it('o lobo da próxima fase vem com o nome dela escrito e quando começa', async () => {
    await seedCycles();
    await renderHoje();
    expect(await screen.findByText(c.nextPhase(c.phases.menstruation.toLowerCase(), 2))).toBeOnTheScreen();
    expect(screen.getByTestId('lobe-next', { includeHiddenElements: true })).toBeTruthy();
  });

  it('sem menstruação registrada convida a registrar', async () => {
    await renderHoje();

    expect(await screen.findByText(c.none)).toBeOnTheScreen();
  });

  it('na gravidez mostra semanas', async () => {
    mockProfile = {
      ...mockProfile,
      mode: 'pregnancy',
      dueDate: addDays(todayIso(), 191),
    };

    await renderHoje();

    expect(await screen.findByText(c.pregnancyWeeks(12, 5))).toBeOnTheScreen();
  });
});
