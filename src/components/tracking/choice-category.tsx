import { Text, View } from 'react-native';

import type { ChoiceCategory } from '@/domain/tracking/catalog';
import { categoryLabels } from '@/i18n/pt-BR-tracking';

import { OptionChip } from './option-chip';

type Labels = { label: string; options: Record<string, string> };

export function ChoiceCategoryField({
  category,
  selected,
  onToggle,
}: {
  category: ChoiceCategory;
  selected: readonly string[];
  onToggle: (option: string) => void;
}) {
  const labels = categoryLabels(category.id) as Labels;
  return (
    <View className="gap-3">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{labels.label}</Text>
      <View
        accessibilityRole={category.kind === 'single' ? 'radiogroup' : undefined}
        accessibilityLabel={labels.label}
        className="flex-row flex-wrap gap-2">
        {category.options.map((option) => (
          <OptionChip
            key={option}
            kind={category.kind}
            label={labels.options[option]}
            accessibilityLabel={`${labels.label}: ${labels.options[option]}`}
            selected={selected.includes(option)}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
    </View>
  );
}
