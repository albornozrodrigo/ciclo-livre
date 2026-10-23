import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { AiSummary } from '@/components/content/ai-summary';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { ARTICLES } from '@/content/articles';
import { type Article, searchArticles, type Topic } from '@/content/search';
import { ptBR } from '@/i18n/pt-BR';

const c = ptBR.content;
const TOPICS: Topic[] = ['ciclo', 'menstruacao', 'sintomas', 'fertilidade', 'fases'];

function ArticleRow({ article }: { article: Article }) {
  return <ListRow label={article.title} detail={article.summary} onPress={() => router.push(`/artigo/${article.id}`)} />;
}

/** Explorar: artigos próprios, por tema, com busca local (sem rede, sem acento). */
export default function ExplorarScreen() {
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchArticles(ARTICLES, query) : []), [query, searching]);

  return (
    <Screen screen="explorar" territory="land" shape={1}>
      <View className="gap-8">
        <View className="gap-2">
          <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{c.search}</Text>
          <TextInput
            accessibilityLabel={c.search}
            value={query}
            onChangeText={setQuery}
            placeholder={c.searchPlaceholder}
            returnKeyType="search"
            autoCorrect={false}
            style={{ paddingHorizontal: 20, paddingVertical: 14, minHeight: 56 }}
            className="rounded-full border-[1.5px] border-ink text-base text-ink placeholder:text-ink-muted dark:border-ink-night dark:text-ink-night dark:placeholder:text-ink-muted-night"
          />
        </View>

        {searching ? (
          <View>
            <Text
              accessibilityLiveRegion="polite"
              className="mb-1 text-sm font-bold tracking-[0.28px] text-ink-muted dark:text-ink-muted-night">
              {c.results(results.length)}
            </Text>
            {results.length === 0 ? (
              <Text className="text-base leading-6 text-ink dark:text-ink-night">{c.noResultsHint}</Text>
            ) : (
              <>
                {/* O cartão fica montado durante a digitação (a chave não é relida a cada letra); ele se zera ao mudar a busca. */}
                <View className="mb-4 mt-2">
                  <AiSummary query={query} articles={results} />
                </View>
                {results.map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </>
            )}
          </View>
        ) : (
          TOPICS.map((topic) => (
            <View key={topic}>
              <Text accessibilityRole="header" className="mb-1 text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
                {c.topics[topic]}
              </Text>
              {ARTICLES.filter((a) => a.topic === topic).map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
