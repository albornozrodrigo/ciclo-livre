/**
 * Espelho em JS dos tokens de src/global.css (fonte normativa: DESIGN.md).
 * Use só onde a API exige cor em JS (SVG, NativeTabs); nas telas, prefira classes Tailwind.
 */
export const Palette = {
  light: {
    water: '#F5F1E4',
    ink: '#2C2E2A',
    inkMuted: '#5B5E57',
    land: '#8ED462',
    coral: '#FF705D',
    sun: '#F5E211',
    pond: '#2BA0FF',
    lilac: '#EBC1FF',
  },
  dark: {
    water: '#151A17',
    ink: '#F2EEE1',
    inkMuted: '#B9B5A8',
    land: '#7BC04F',
    coral: '#F0634F',
    sun: '#EBD70F',
    pond: '#2A93E8',
    lilac: '#D9A9F2',
  },
} as const;

export type Scheme = keyof typeof Palette;
export type Territory = 'land' | 'coral' | 'sun' | 'pond' | 'lilac';
