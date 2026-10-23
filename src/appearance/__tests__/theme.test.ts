import { Appearance, Platform } from 'react-native';

import { applySavedTheme, getSavedTheme, saveTheme } from '@/appearance/theme';

const mockStore = new Map<string, string>();
let mockFail = false;
jest.mock('expo-secure-store', () => ({
  getItem: (k: string) => mockStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (mockFail) throw new Error('keystore');
    mockStore.set(k, v);
  },
}));
jest.mock('@/lib/logger', () => ({ log: { error: jest.fn() } }));

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockStore.clear();
  mockFail = false;
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

  it('armazenamento quebrado: o tema vale na sessão e o toque não derruba o app', () => {
    mockFail = true;
    expect(() => saveTheme('light')).not.toThrow();
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('light');
  });

  it('fora do Android (web, render do build) não tenta ler nem aplicar o tema', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.mocked(Appearance.setColorScheme).mockClear();
    applySavedTheme();
    expect(Appearance.setColorScheme).not.toHaveBeenCalled();
  });
});
