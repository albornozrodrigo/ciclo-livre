import '@/global.css';

import { DarkTheme, DefaultTheme, type ErrorBoundaryProps, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { AppError } from '@/components/ui/app-error';
import { DatabaseRoot } from '@/db/database-root';

/** Falhas ao abrir o banco (ou qualquer erro não tratado) caem aqui, sem detalhes técnicos. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <AppError error={error} retry={retry} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Ícones escuros: toda tela tem um lobo saturado atrás da barra de status. */}
      <StatusBar style="dark" />
      <DatabaseRoot>
        <AppTabs />
      </DatabaseRoot>
    </ThemeProvider>
  );
}
