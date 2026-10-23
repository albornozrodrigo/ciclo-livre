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
        <Stack.Screen name="perfil" />
        <Stack.Screen name="registro" />
        <Stack.Screen name="lembretes" />
        <Stack.Screen name="dados" />
        <Stack.Screen name="artigo" />
        <Stack.Screen name="ia" />
        <Stack.Screen name="chat" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
