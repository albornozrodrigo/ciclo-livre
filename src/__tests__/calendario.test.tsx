import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CalendarioScreen from '@/app/(tabs)/calendario';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const cal = ptBR.calendar;

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
let mockProfile: Profile;
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({ state: { status: 'ready', profile: mockProfile } }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { push: (h: unknown) => mockPush(h) },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};
const monthName = (offset: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const renderCalendar = async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <CalendarioScreen />
    </SafeAreaProvider>,
  );
  await screen.findByRole('header', { name: new RegExp(monthName(0), 'i') });
};
// A VirtualizedList repassa as props dela para o ScrollView nativo.
const list = () => screen.getByTestId('calendar-list');

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

describe('Calendário', () => {
  it('abre no mês atual, numa lista que rola de mês em mês, com legenda escrita', async () => {
    await renderCalendar();

    expect(screen.queryByRole('button', { name: 'Mês anterior' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Próximo mês' })).toBeNull();
    // O mês seguinte já vem logo abaixo.
    expect(screen.getByRole('header', { name: new RegExp(monthName(1), 'i') })).toBeOnTheScreen();
    expect(screen.getByText(cal.legend.menstruation, { includeHiddenElements: true })).toBeTruthy();
  });

  it('a lista começa 12 meses atrás e cresce para o futuro sem limite', async () => {
    await renderCalendar();
    const before = list().props.data.length;
    expect(list().props.initialScrollIndex).toBe(12);

    for (let i = 0; i < 5; i++) await act(async () => list().props.onEndReached());

    expect(list().props.data.length).toBe(before + 5 * 12);
  });

  it('cada dia tem nome acessível com fase e registro (cor nunca sozinha)', async () => {
    await setSelection(mockDb, todayIso(), 'period', ['medium']);

    await renderCalendar();

    expect(
      await screen.findByRole('button', {
        name: new RegExp(`${cal.phase.menstruation}.*${cal.logged}`),
      }),
    ).toBeOnTheScreen();
  });

  it('tocar num dia até hoje abre o registro daquele dia', async () => {
    await renderCalendar();

    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${cal.todayLabel}`) }));

    expect(mockPush).toHaveBeenCalledWith(`/registro/${todayIso()}`);
  });

  it('dia futuro não abre registro e é anunciado como desativado', async () => {
    await renderCalendar();
    const now = new Date();
    const label = new Date(now.getFullYear(), now.getMonth() + 1, 15).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

    const futureDay = screen.getAllByRole('button', { name: new RegExp(`^${label}`) })[0];
    expect(futureDay).toBeDisabled();
    await fireEvent.press(futureDay);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('"Voltar para hoje" aparece só quando o mês atual sai da tela', async () => {
    await renderCalendar();
    const current = list().props.data[12];

    await act(async () => list().props.onViewableItemsChanged({ viewableItems: [{ item: current, index: 12, key: String(current), isViewable: true }], changed: [] }));
    expect(screen.queryByRole('button', { name: cal.goToday })).toBeNull();

    await act(async () => list().props.onViewableItemsChanged({ viewableItems: [], changed: [] }));
    expect(screen.getByRole('button', { name: cal.goToday })).toBeOnTheScreen();
  });

  it('hoje tem a marca de sol (e a legenda explica)', async () => {
    await renderCalendar();
    // Uma no dia de hoje, outra na legenda.
    expect(await screen.findAllByTestId('today-mark', { includeHiddenElements: true })).toHaveLength(2);
  });
});
