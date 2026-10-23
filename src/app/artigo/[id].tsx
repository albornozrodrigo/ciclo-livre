import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ARTICLES } from '@/content/articles';
import type { Block } from '@/content/search';
import { ptBR } from '@/i18n/pt-BR';

const c = ptBR.content;

function BlockView({ block }: { block: Block }) {
  if (block.kind === 'h') {
    return (
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[28px] text-ink dark:text-ink-night">
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

/** Leitura de um artigo: sem lobo (é leitura), blocos com hierarquia, fontes e aviso. */
export default function ArtigoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = ARTICLES.find((a) => a.id === id);
  if (!article) {
    return (
      <FormScreen title={ptBR.screens.explorar.title}>
        <Text className="text-base text-ink dark:text-ink-night">{c.notFound}</Text>
      </FormScreen>
    );
  }
  return (
    <FormScreen title={article.title} hint={`${article.summary} ${c.minutes(article.minutes)}`}>
      {/* Texto corrido: 16dp entre blocos; título com mais espaço acima (32) do que abaixo (16). */}
      <View className="gap-4">
        {article.blocks.map((block, i) => (
          <View key={`${block.kind}-${i}`} className={block.kind === 'h' && i > 0 ? 'mt-4' : undefined}>
            <BlockView block={block} />
          </View>
        ))}
      </View>
      <View className="gap-2 border-t border-line pt-6 dark:border-line-night">
        <Text accessibilityRole="header" className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">
          {c.sources}
        </Text>
        {article.sources.map((s) => (
          <Text key={s} className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">
            {s}
          </Text>
        ))}
      </View>
      <View className="rounded-[28px] border-[1.5px] border-ink p-5 dark:border-ink-night">
        <Text className="text-sm leading-5 text-ink dark:text-ink-night">{c.disclaimer}</Text>
      </View>
    </FormScreen>
  );
}
