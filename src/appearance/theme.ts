import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';

import { log } from '@/lib/logger';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Preferência de aparência (não é dado de saúde). Leitura síncrona: o tema vale antes do primeiro desenho. */
const KEY = 'ui_theme';
const isTheme = (v: unknown): v is Theme => typeof v === 'string' && (THEMES as readonly string[]).includes(v);

export function getSavedTheme(): Theme {
  try {
    const value = SecureStore.getItem(KEY);
    return isTheme(value) ? value : 'system';
  } catch (e) {
    log.error('theme_load_failed', e);
    return 'system';
  }
}

/** Claro/escuro força o modo nativo também (seletores de data, barras); sistema remove a escolha. */
const apply = (theme: Theme) => Appearance.setColorScheme(theme === 'system' ? 'auto' : theme);

export function applySavedTheme(): void {
  apply(getSavedTheme());
}

export function saveTheme(theme: Theme): void {
  SecureStore.setItem(KEY, theme);
  apply(theme);
}
