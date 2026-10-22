import { render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnaliseScreen from '@/app/analise';
import CalendarioScreen from '@/app/calendario';
import ExplorarScreen from '@/app/explorar';
import HojeScreen from '@/app/index';
import MaisScreen from '@/app/mais';
import { ptBR, type ScreenKey } from '@/i18n/pt-BR';

// O banco nativo (SQLCipher) não existe no Jest; as telas só precisam do hook.
jest.mock('@/db/database-root', () => ({ useEraseAllData: () => jest.fn() }));

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
  it.each(cases)('%s mostra título, fase e texto vindos do pt-BR', async (key, Component) => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Component />
      </SafeAreaProvider>,
    );
    const copy = ptBR.screens[key];
    expect(await screen.findByRole('header', { name: copy.title })).toBeOnTheScreen();
    expect(screen.getByText(copy.phase)).toBeOnTheScreen();
    expect(screen.getByText(copy.lead)).toBeOnTheScreen();
  });

  it('o lobo é decorativo e fica fora da árvore de acessibilidade', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <HojeScreen />
      </SafeAreaProvider>,
    );
    const lobe = await screen.findByTestId('lobe', { includeHiddenElements: true });
    expect(lobe.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

describe('rótulos das abas', () => {
  it('são exatamente Hoje, Calendário, Análise, Explorar e Mais, nessa ordem', () => {
    expect(Object.values(ptBR.tabs)).toEqual(['Hoje', 'Calendário', 'Análise', 'Explorar', 'Mais']);
  });
});
