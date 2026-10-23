import { Text, View } from 'react-native';

/** Lista com ponto de tinta de 8dp (padrão das telas de consentimento e leitura). */
export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item} className="flex-row items-start gap-3">
          <View className="mt-2.5 h-2 w-2 rounded-full bg-ink dark:bg-ink-night" />
          <Text className="flex-1 text-base leading-6 text-ink dark:text-ink-night">{item}</Text>
        </View>
      ))}
    </View>
  );
}
