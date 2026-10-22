import { useColorScheme } from 'react-native';

import { Palette } from '@/constants/theme';

/** Cores de gráfico: tinta sobre água (sem paleta categórica; cores de fase são das fases). */
export function useChartColors() {
  const p = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return { ink: p.ink, muted: p.inkMuted, surface: p.water, grid: p.line };
}
