import { fireEvent, render, screen } from '@testing-library/react-native';
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
const renderCalendar = async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <CalendarioScreen />
    </SafeAreaProvider>,
  );
  await screen.findByRole('button', { name: cal.previousMonth });
};

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
  it('mostra o mês atual por extenso e uma legenda escrita', async () => {
    await renderCalendar();

    const month = new Date().toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    expect(screen.getByRole('header', { name: new RegExp(month, 'i') })).toBeOnTheScreen();
    expect(screen.getByText(cal.legend.menstruation)).toBeOnTheScreen();
  });

  it('cada dia tem nome acessível com fase e registro (cor nunca sozinha)', async () => {
    const today = todayIso();
    await setSelection(mockDb, today, 'period', ['medium']);

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

  it('navega para meses seguintes sem limite', async () => {
    await renderCalendar();

    for (let i = 0; i < 24; i++) await fireEvent.press(screen.getByRole('button', { name: cal.nextMonth }));

    const future = new Date(new Date().getFullYear() + 2, new Date().getMonth(), 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    expect(screen.getByRole('header', { name: new RegExp(future, 'i') })).toBeOnTheScreen();
  });

  it('dia futuro não abre registro', async () => {
    await renderCalendar();
    await fireEvent.press(screen.getByRole('button', { name: cal.nextMonth }));

    const futureDay = screen.getAllByRole('button', { name: /^\d+ de / })[10];
    await fireEvent.press(futureDay);

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('Calendário › acessibilidade', () => {
  it('dias futuros são anunciados como desativados', async () => {
    await renderCalendar();
    await fireEvent.press(screen.getByRole('button', { name: cal.nextMonth }));

    const futureDay = screen.getAllByRole('button', { name: /^\d+ de / })[10];
    expect(futureDay).toBeDisabled();
  });
});
