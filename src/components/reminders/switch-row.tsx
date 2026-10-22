import { Pressable, Switch, Text, View } from "react-native";

type Props = {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Toque no texto abre o detalhe; o interruptor é um controle à parte. */
  onPress?: () => void;
};

/** Linha com interruptor (≥64dp): rótulo e detalhe à esquerda, switch acessível à direita. */
export function SwitchRow({
  label,
  detail,
  value,
  onValueChange,
  onPress,
}: Props) {
  const text = (
    <View className="flex-1 gap-0.5">
      <Text className="text-base font-bold text-ink dark:text-ink-night">
        {label}
      </Text>
      {detail ? (
        <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
          {detail}
        </Text>
      ) : null}
    </View>
  );
  return (
    <View className="min-h-16 flex-row items-center gap-3 border-b border-line py-2 dark:border-line-night">
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={detail ? `${label}. ${detail}` : label}
          onPress={onPress}
          className="min-h-12 flex-1 justify-center active:opacity-70"
        >
          {text}
        </Pressable>
      ) : (
        text
      )}
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}
