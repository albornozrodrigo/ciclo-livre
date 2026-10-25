import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import type { MeasureCategory } from '@/domain/tracking/catalog';
import { type MeasureError, validateMeasure } from '@/domain/tracking/rules';
import { ptBR } from '@/i18n/pt-BR';
import { categoryLabels } from '@/i18n/pt-BR-tracking';
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
  const label = categoryLabels(category.id).label;
  const [text, setText] = useState(format(value));
  const [error, setError] = useState<string | null>(null);
  const { schedule, flush, cancel } = useDebouncedSave(onSave);
  // Erro aparece sozinho após uma pausa: no Android, fechar o teclado não dispara blur nem submit.
  const errorDisplay = useDebouncedSave(setError);

  // Valor salvo mudou por fora (ex.: desfeito após erro). Só reescreve o texto se ele não
  // representa já esse valor, para não apagar o que está sendo digitado ("36," continua "36,").
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    const current = parse(text, category);
    const matches = current.kind === 'value' ? current.value === value : current.kind === 'empty' && value === undefined;
    if (!matches) setText(format(value));
  }

  function handleChange(next: string) {
    setText(next);
    setError(null);
    const parsed = parse(next, category);
    if (parsed.kind === 'error') {
      cancel();
      errorDisplay.schedule(parsed.message);
      return;
    }
    errorDisplay.cancel();
    if (parsed.kind === 'value' && parsed.value !== value) schedule(parsed.value);
    else if (parsed.kind === 'empty' && value !== undefined) schedule(null);
    else cancel();
  }

  function handleCommit() {
    const parsed = parse(text, category);
    if (parsed.kind === 'error') {
      errorDisplay.cancel();
      setError(parsed.message);
    }
    flush();
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-bold tracking-[0.28px] text-ink dark:text-ink-night">{label}</Text>
      {/* Erro acima do campo: com o teclado aberto, o que fica abaixo do campo some atrás dele. */}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm font-bold leading-5 text-ink dark:text-ink-night">
          {`${ptBR.tracking.measureErrors.prefix} ${error}`}
        </Text>
      ) : null}
      {/* Com erro, contorno mais grosso: sinal visível que não depende de cor. */}
      <View
        className={
          error
            ? 'min-h-14 flex-row items-center rounded-full border-[3px] border-ink pr-5 dark:border-ink-night'
            : 'min-h-14 flex-row items-center rounded-full border-[1.5px] border-ink pr-5 dark:border-ink-night'
        }>
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
    </View>
  );
}
