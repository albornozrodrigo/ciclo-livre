import { applySavedTheme } from './theme';

// Importado antes do global.css: o tema salvo vale antes de o NativeWind ler o esquema de cor.
applySavedTheme();
