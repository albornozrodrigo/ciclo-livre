import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { NOTE_MAX_LENGTH } from '@/domain/tracking/rules';
import { ptBR } from '@/i18n/pt-BR';
import { useDebouncedSave } from '@/lib/use-debounced-save';

const copy = ptBR.tracking.note;

export function NoteField({ value, onSave }: { value: string | null; onSave: (text: string) => void }) {
  const [text, setText] = useState(value ?? '');
  const { schedule, flush } = useDebouncedSave(onSave);
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value ?? '');
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{copy.label}</Text>
      <TextInput
        accessibilityLabel={copy.label}
        value={text}
        onChangeText={(next) => {
          setText(next);
          schedule(next);
        }}
        onBlur={flush}
        placeholder={copy.placeholder}
        multiline
        maxLength={NOTE_MAX_LENGTH}
        textAlignVertical="top"
        style={{ padding: 20, minHeight: 120 }}
        className="rounded-[28px] border-[1.5px] border-ink text-base leading-6 text-ink placeholder:text-ink-muted dark:border-ink-night dark:text-ink-night dark:placeholder:text-ink-muted-night"
      />
      <Text className="self-end text-sm text-ink-muted [font-variant:tabular-nums] dark:text-ink-muted-night">
        {copy.counter(text.length, NOTE_MAX_LENGTH)}
      </Text>
    </View>
  );
}
