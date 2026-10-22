import { Stack } from 'expo-router';

type Props = {
  /** true quando existe perfil salvo: só as abas ficam acessíveis; senão, só o onboarding. */
  onboarded: boolean;
};

/** Navegador raiz. As guardas valem também para deep links. */
export function RootNavigator({ onboarded }: Props) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
