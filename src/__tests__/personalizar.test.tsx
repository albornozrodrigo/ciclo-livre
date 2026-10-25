import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PersonalizarScreen from '@/app/registro/personalizar';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getCategoryPrefs } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const t = ptBR.tracking.categories;
const c = ptBR.tracking.customizeScreen;

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const profile: Profile = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
};
jest.mock('@/profile/profile-context', () => ({ useProfile: () => ({ state: { status: 'ready', profile } }) }));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
jest.mock('expo-router', () => ({ router: { canGoBack: () => true, back: jest.fn() } }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const renderScreen = async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PersonalizarScreen />
    </SafeAreaProvider>,
  );
  await screen.findByText(t.period.label);
};

beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
});

describe('Personalizar categorias', () => {
  it('esconder uma categoria salva a preferência', async () => {
    await renderScreen();

    await fireEvent(screen.getByRole('switch', { name: c.show(t.pain.label) }), 'valueChange', false);
    await fireEvent.press(screen.getByRole('button', { name: c.save }));

    await waitFor(async () =>
      expect((await getCategoryPrefs(mockDb)).find((p) => p.category === 'pain')).toEqual(expect.objectContaining({ hidden: true })),
    );
  });

  it('mover para cima troca a posição com a anterior', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: c.moveUp(t.spotting.label) }));
    await fireEvent.press(screen.getByRole('button', { name: c.save }));

    await waitFor(async () => {
      const prefs = await getCategoryPrefs(mockDb);
      expect(prefs.slice(0, 2).map((p) => p.category)).toEqual(['spotting', 'period']);
    });
  });

  it('a primeira não sobe e a última não desce', async () => {
    await renderScreen();

    expect(screen.getByRole('button', { name: c.moveUp(t.period.label) })).toBeDisabled();
  });

  it('restaurar padrão apaga as preferências', async () => {
    await renderScreen();
    await fireEvent(screen.getByRole('switch', { name: c.show(t.pain.label) }), 'valueChange', false);

    await fireEvent.press(screen.getByRole('button', { name: c.reset }));
    await fireEvent.press(screen.getByRole('button', { name: c.save }));

    await waitFor(async () => expect((await getCategoryPrefs(mockDb)).every((p) => !p.hidden)).toBe(true));
  });
});
