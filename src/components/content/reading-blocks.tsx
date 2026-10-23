import { Text, View } from 'react-native';

import type { PolicyBlock } from '@/content/privacy-policy';

/** Um bloco de texto de leitura (modo Read do DESIGN.md): título 22sp, subtítulo 17sp/700, corpo 17sp. */
function BlockView({ block }: { block: PolicyBlock }) {
  if (block.kind === 'h') {
    return (
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[28px] text-ink dark:text-ink-night">
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'sub') {
    return (
      <Text accessibilityRole="header" className="text-[17px] font-bold leading-7 text-ink dark:text-ink-night">
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'list') {
    return (
      <View className="gap-2">
        {block.items.map((item) => (
          <View key={item} className="flex-row items-start gap-3">
            <View className="mt-2.5 h-2 w-2 rounded-full bg-ink dark:bg-ink-night" />
            <Text className="flex-1 text-[17px] leading-7 text-ink dark:text-ink-night">{item}</Text>
          </View>
        ))}
      </View>
    );
  }
  return <Text className="text-[17px] leading-7 text-ink dark:text-ink-night">{block.text}</Text>;
}

/** Texto corrido: 16dp entre blocos; título com mais espaço acima (32) do que abaixo (16). */
export function ReadingBlocks({ blocks }: { blocks: readonly PolicyBlock[] }) {
  return (
    <View className="gap-4">
      {blocks.map((block, i) => (
        <View key={`${block.kind}-${i}`} className={(block.kind === 'h' || block.kind === 'sub') && i > 0 ? 'mt-4' : undefined}>
          <BlockView block={block} />
        </View>
      ))}
    </View>
  );
}
