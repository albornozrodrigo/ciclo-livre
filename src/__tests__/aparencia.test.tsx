import { fireEvent, render, screen } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AparenciaScreen from '@/app/aparencia';
import { ptBR } from '@/i18n/pt-BR';

const a = ptBR.appearance;
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItem: (k: string) => mockStore.get(k) ?? null,
  setItem: (k: string, v: string) => void mockStore.set(k, v),
}));
let mockIcon = 'padrao';
const mockSetIcon = jest.fn((n: string) => {
  mockIcon = n;
});
jest.mock('../../modules/app-icon', () => ({
  appIconSupported: () => true,
  getAppIcon: () => mockIcon,
  setAppIcon: (n: string) => mockSetIcon(n),
}));
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const ui = () => (
  <SafeAreaProvider initialMetrics={metrics}>
    <AparenciaScreen />
  </SafeAreaProvider>
);

beforeEach(() => {
  mockStore.clear();
  mockIcon = 'padrao';
  jest.clearAllMocks();
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});

describe('Aparência', () => {
  it('troca o tema na hora', async () => {
    await render(ui());
    expect(screen.getByRole('radio', { name: a.themes.system })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: a.themes.dark }));
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
    expect(screen.getByRole('radio', { name: a.themes.dark })).toBeChecked();
  });

  it('escolhe o ícone e avisa que a troca acontece ao sair do app', async () => {
    await render(ui());
    expect(screen.getByRole('radio', { name: a.icons.padrao })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(a.icons.discreto) }));
    expect(mockSetIcon).toHaveBeenCalledWith('discreto');
    expect(screen.getByRole('radio', { name: new RegExp(a.icons.discreto) })).toBeChecked();
    expect(screen.getByText(a.iconPending)).toBeOnTheScreen();
  });
});
