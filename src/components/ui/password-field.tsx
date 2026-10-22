import { Text, TextInput, View } from 'react-native';

type Props = { label: string; value: string; onChange: (value: string) => void; error?: string | null; newPassword?: boolean };

/** Campo de senha: cápsula de contorno; erro = contorno de 3dp + "Erro: …" anunciado (como o campo de medição). */
export function PasswordField({ label, value, onChange, error, newPassword = false }: Props) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={newPassword ? 'new-password' : 'current-password'}
        style={{ paddingHorizontal: 20, paddingVertical: 14, minHeight: 56 }}
        className={`rounded-[28px] text-base text-ink dark:text-ink-night ${
          error ? 'border-[3px] border-ink dark:border-ink-night' : 'border-[1.5px] border-ink dark:border-ink-night'
        }`}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm font-bold text-ink dark:text-ink-night">
          {`Erro: ${error}`}
        </Text>
      ) : null}
    </View>
  );
}
