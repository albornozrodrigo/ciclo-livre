import { Appearance } from 'react-native';

import { applySavedTheme, getSavedTheme, saveTheme } from '@/appearance/theme';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItem: (k: string) => mockStore.get(k) ?? null,
  setItem: (k: string, v: string) => void mockStore.set(k, v),
}));

beforeEach(() => {
  mockStore.clear();
  jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});

describe('tema', () => {
  it('padrão: segue o sistema', () => {
    expect(getSavedTheme()).toBe('system');
    applySavedTheme();
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('auto');
  });

  it('salva, aplica na hora e vale na próxima abertura', () => {
    saveTheme('dark');
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');
    expect(getSavedTheme()).toBe('dark');
    applySavedTheme();
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');
  });

  it('valor estranho guardado: volta para o sistema', () => {
    mockStore.set('ui_theme', 'roxo');
    expect(getSavedTheme()).toBe('system');
  });
});
