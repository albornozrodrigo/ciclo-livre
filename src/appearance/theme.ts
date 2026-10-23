import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

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
const apply = (theme: Theme) => {
  // Fora do app nativo (web, render no servidor durante o build) não há esquema de cor para forçar.
  if (typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(theme === 'system' ? 'auto' : theme);
};

/** Roda quando o app carrega; só no Android (no build e na web não há SecureStore nem tema nativo). */
export function applySavedTheme(): void {
  if (Platform.OS !== 'android') return;
  apply(getSavedTheme());
}

/** Aplica na hora; se o armazenamento falhar, o tema vale nesta sessão e o erro vai para o log. */
export function saveTheme(theme: Theme): void {
  apply(theme);
  try {
    SecureStore.setItem(KEY, theme);
  } catch (e) {
    log.error('theme_save_failed', e);
  }
}
