import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { CapsuleButton } from '@/components/ui/capsule-button';
import type { IsoDate } from '@/domain/dates';
import { TAG_MAX_LENGTH } from '@/domain/tracking/tags';
import { ptBR } from '@/i18n/pt-BR';
import { useDayTags } from '@/tracking/use-day-tags';

import { OptionChip } from './option-chip';

const copy = ptBR.tags;

/** Tags próprias (ilimitadas): marcar no dia e criar na hora. */
export function TagsField({ date }: { date: IsoDate }) {
  const { state, toggle, create } = useDayTags(date);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!state) return null;

  async function handleAdd() {
    const problem = await create(name);
    if (problem) return setError(copy.errors[problem]);
    setError(null);
    setName('');
  }

  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-[22px] font-bold leading-[26px] text-ink dark:text-ink-night">
        {copy.title}
      </Text>
      {state.all.length === 0 ? <Text className="text-base leading-6 text-ink-muted dark:text-ink-muted-night">{copy.hint}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {state.all.map((tag) => (
          <OptionChip
            key={tag.id}
            kind="multi"
            label={tag.name}
            accessibilityLabel={`${copy.title}: ${tag.name}`}
            selected={state.selected.includes(tag.id)}
            onPress={() => toggle(tag.id)}
          />
        ))}
      </View>
      <View className="gap-2">
        <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.newLabel}</Text>
        <TextInput
          accessibilityLabel={copy.newLabel}
          value={name}
          onChangeText={(next) => {
            setName(next);
            setError(null);
          }}
          onSubmitEditing={handleAdd}
          placeholder={copy.placeholder}
          maxLength={TAG_MAX_LENGTH + 10}
          returnKeyType="done"
          style={{ paddingHorizontal: 20 }}
          className="min-h-14 rounded-full border-[1.5px] border-ink text-base text-ink placeholder:text-ink-muted dark:border-ink-night dark:text-ink-night dark:placeholder:text-ink-muted-night"
        />
        {error ? (
          <Text accessibilityLiveRegion="polite" className="text-sm font-bold leading-5 text-ink dark:text-ink-night">
            {error}
          </Text>
        ) : null}
        <View className="self-start">
          <CapsuleButton variant="outline" label={copy.add} onPress={handleAdd} />
        </View>
      </View>
    </View>
  );
}
