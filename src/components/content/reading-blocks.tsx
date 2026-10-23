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

/**
 * Espaço extra acima: título de seção 32dp, subtítulo 24dp (nenhum logo depois do título, que fica colado ao conteúdo).
 * Mais espaço acima do que abaixo (16dp entre blocos).
 */
function spaceAbove(blocks: readonly PolicyBlock[], i: number): string | undefined {
  if (i === 0) return undefined;
  if (blocks[i].kind === 'h') return 'mt-4';
  if (blocks[i].kind === 'sub' && blocks[i - 1].kind !== 'h') return 'mt-2';
  return undefined;
}

/** Texto corrido com hierarquia de leitura. */
export function ReadingBlocks({ blocks }: { blocks: readonly PolicyBlock[] }) {
  return (
    <View className="gap-4">
      {blocks.map((block, i) => (
        <View key={`${block.kind}-${i}`} className={spaceAbove(blocks, i)}>
          <BlockView block={block} />
        </View>
      ))}
    </View>
  );
}
