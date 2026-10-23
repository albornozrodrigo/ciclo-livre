import { render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnaliseScreen from '@/app/(tabs)/analise';
import CalendarioScreen from '@/app/(tabs)/calendario';
import ExplorarScreen from '@/app/(tabs)/explorar';
import HojeScreen from '@/app/(tabs)/index';
import MaisScreen from '@/app/(tabs)/mais';
import { ptBR, type ScreenKey } from '@/i18n/pt-BR';

// Trava do app tem testes próprios (src/security); aqui só a tela.
jest.mock('@/security/security-settings', () => ({ SecuritySettings: () => null }));

// O banco nativo (SQLCipher) não existe no Jest; as telas só precisam do hook.
jest.mock('@/db/database-root', () => ({ useEraseAllData: () => jest.fn() }));
// Hoje lê o resumo do dia; nesta suíte basta um banco vazio.
const mockEmptyDb = {
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
};
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockEmptyDb }));
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/components/ui/snackbar', () => ({
  useSnackbar: () => ({ show: jest.fn() }),
}));
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({ state: { status: 'ready', profile: null } }),
}));
jest.mock('@/cycle/use-today-cycle', () => ({ useTodayCycle: () => null }));
jest.mock('@/analysis/use-analysis', () => ({
  useAnalysis: () => null,
  MEASURES: [],
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

const cases: [ScreenKey, ComponentType][] = [
  ['hoje', HojeScreen],
  ['calendario', CalendarioScreen],
  ['analise', AnaliseScreen],
  ['explorar', ExplorarScreen],
  ['mais', MaisScreen],
];

describe('telas das abas', () => {
  it.each(cases)('%s mostra título e texto vindos do pt-BR', async (key, Component) => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Component />
      </SafeAreaProvider>,
    );
    const copy = ptBR.screens[key];
    expect(await screen.findByRole('header', { name: copy.title })).toBeOnTheScreen();
    if ('lead' in copy) expect(screen.getByText(copy.lead)).toBeOnTheScreen();
  });

  it('o lobo é decorativo e fica fora da árvore de acessibilidade', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <HojeScreen />
      </SafeAreaProvider>,
    );
    const lobe = await screen.findByTestId('lobe', {
      includeHiddenElements: true,
    });
    expect(lobe.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

describe('rótulos das abas', () => {
  it('são exatamente Hoje, Calendário, Análise, Explorar e Mais, nessa ordem', () => {
    expect(Object.values(ptBR.tabs)).toEqual(['Hoje', 'Calendário', 'Análise', 'Explorar', 'Mais']);
  });
});
