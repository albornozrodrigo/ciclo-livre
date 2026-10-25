import { Text, View } from 'react-native';

import type { LikelySymptom } from '@/domain/cycle/likely-today';
import { ptBR } from '@/i18n/pt-BR';
import { categoryLabels } from '@/i18n/pt-BR-tracking';

const k = ptBR.cycle.likelyToday;

/** "Pode aparecer hoje": cada sintoma com o motivo; um foco por item no TalkBack. */
export function LikelyToday({ items }: { items: readonly LikelySymptom[] }) {
  if (items.length === 0) return null;
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-[17px] font-bold leading-6 text-ink dark:text-ink-night">
        {k.title}
      </Text>
      {items.map((item) => {
        const label = categoryLabels(item.category).options?.[item.option] ?? item.option;
        const line = k.row(label, item.cycles, item.total);
        return (
          <Text key={`${item.category}:${item.option}`} accessible className="text-base leading-6 text-ink dark:text-ink-night">
            {line}
          </Text>
        );
      })}
      <Text className="text-sm leading-5 text-ink-muted dark:text-ink-muted-night">{k.hint}</Text>
    </View>
  );
}
