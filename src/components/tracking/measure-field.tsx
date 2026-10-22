import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import type { MeasureCategory } from '@/domain/tracking/catalog';
import { type MeasureError, validateMeasure } from '@/domain/tracking/rules';
import { ptBR } from '@/i18n/pt-BR';
import { useDebouncedSave } from '@/lib/use-debounced-save';

const errors = ptBR.tracking.measureErrors;

const format = (value: number | undefined) => (value === undefined ? '' : String(value).replace('.', ','));

type Parsed = { kind: 'empty' } | { kind: 'value'; value: number } | { kind: 'error'; message: string };

function parse(text: string, category: MeasureCategory): Parsed {
  const trimmed = text.trim();
  if (trimmed === '') return { kind: 'empty' };
  const value = Number(trimmed.replace(',', '.'));
  if (Number.isNaN(value)) return { kind: 'error', message: errors.not_a_number };
  const problem: MeasureError | null = validateMeasure(category.id, value);
  if (problem === 'out_of_range') return { kind: 'error', message: errors.out_of_range(category.min, category.max, category.unit) };
  if (problem === 'too_precise') return { kind: 'error', message: errors.too_precise(category.decimals) };
  return { kind: 'value', value };
}

/** Número com unidade: salva enquanto digita (quando válido); erro aparece ao confirmar ou sair. */
export function MeasureField({ category, value, onSave }: { category: MeasureCategory; value: number | undefined; onSave: (value: number | null) => void }) {
  const label = (ptBR.tracking.categories as Record<string, { label: string }>)[category.id].label;
  const [text, setText] = useState(format(value));
  const [error, setError] = useState<string | null>(null);
  const { schedule, flush, cancel } = useDebouncedSave(onSave);

  // Valor salvo mudou (ex.: desfeito após erro): recomeça o texto a partir dele.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(format(value));
  }

  function handleChange(next: string) {
    setText(next);
    setError(null);
    const parsed = parse(next, category);
    if (parsed.kind === 'value' && parsed.value !== value) schedule(parsed.value);
    else if (parsed.kind === 'empty' && value !== undefined) schedule(null);
    else cancel();
  }

  function handleCommit() {
    const parsed = parse(text, category);
    if (parsed.kind === 'error') setError(parsed.message);
    flush();
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      <View className="min-h-14 flex-row items-center rounded-full border-[1.5px] border-ink pr-5 dark:border-ink-night">
        <TextInput
          accessibilityLabel={`${label}, ${category.unit}`}
          accessibilityHint={error ?? undefined}
          value={text}
          onChangeText={handleChange}
          onBlur={handleCommit}
          onSubmitEditing={handleCommit}
          keyboardType="decimal-pad"
          returnKeyType="done"
          style={{ paddingHorizontal: 20 }}
          className="flex-1 text-lg font-bold text-ink [font-variant:tabular-nums] dark:text-ink-night"
        />
        <Text className="text-base text-ink-muted dark:text-ink-muted-night">{category.unit}</Text>
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-ink dark:text-ink-night">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
