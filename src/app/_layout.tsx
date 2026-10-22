import '@/global.css';

import { DarkTheme, DefaultTheme, type ErrorBoundaryProps, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, useColorScheme } from 'react-native';

import { AppError } from '@/components/ui/app-error';
import { SnackbarProvider } from '@/components/ui/snackbar';
import { DatabaseRoot, resetUnopenableDatabase } from '@/db/database-root';
import { ptBR } from '@/i18n/pt-BR';
import { RootNavigator } from '@/navigation/root-navigator';
import { ProfileProvider, useProfile } from '@/profile/profile-context';
import { ReminderBridge } from '@/reminders/reminder-bridge';

/** Falhas ao abrir o banco (ou qualquer erro não tratado) caem aqui, sem detalhes técnicos. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <AppError error={error} retry={retry} reset={resetUnopenableDatabase} confirmReset={confirmReset} />;
}

/** Diálogo nativo com a ação destrutiva marcada; resolve true só em "Apagar tudo". */
function confirmReset(): Promise<boolean> {
  const copy = ptBR.appError;
  return new Promise((resolve) => {
    Alert.alert(
      copy.resetConfirmTitle,
      copy.resetConfirmBody,
      [
        {
          text: ptBR.privacy.confirmCancel,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: ptBR.privacy.confirmErase,
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Ícones escuros: toda tela tem um lobo saturado atrás da barra de status (abas e onboarding). */}
      <StatusBar style="dark" />
      <SnackbarProvider>
        <DatabaseRoot>
          <ProfileProvider>
            <ProfileGate />
          </ProfileProvider>
        </DatabaseRoot>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

/** Espera o perfil carregar e escolhe entre onboarding e abas. */
function ProfileGate() {
  const { state } = useProfile();
  if (state.status !== 'ready') return null;
  const onboarded = state.profile !== null;
  return (
    <>
      <RootNavigator onboarded={onboarded} />
      {/* Lembretes só existem com perfil; "apagar tudo" cancela os pendentes. */}
      {onboarded ? <ReminderBridge /> : null}
    </>
  );
}
