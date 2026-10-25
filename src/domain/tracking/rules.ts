import { type Category, categoryById, type ChoiceCategory } from './catalog';

/** Liga/desliga uma opção respeitando single/multi; mantém a ordem do catálogo. */
export function toggleOption(category: ChoiceCategory, selected: readonly string[], option: string): string[] {
  if (!category.options.includes(option)) return [...selected];
  const isOn = selected.includes(option);
  if (category.kind === 'single') return isOn ? [] : [option];
  const next = isOn ? selected.filter((o) => o !== option) : [...selected, option];
  return category.options.filter((o) => next.includes(o));
}

export type MeasureError = 'not_a_measure' | 'out_of_range' | 'too_precise';

export function validateMeasure(categoryId: string, value: number): MeasureError | null {
  const category: Category | undefined = categoryById(categoryId);
  if (!category || category.kind !== 'measure') return 'not_a_measure';
  if (!Number.isFinite(value) || value < category.min || value > category.max) return 'out_of_range';
  const scale = 10 ** category.decimals;
  // Tolerância para ponto flutuante (36.55 * 100 = 3654.9999…).
  if (Math.abs(Math.round(value * scale) - value * scale) > 1e-6) return 'too_precise';
  return null;
}

export const NOTE_MAX_LENGTH = 1000;

export function validateNote(text: string): 'empty' | 'too_long' | null {
  if (text.trim().length === 0) return 'empty';
  if (text.length > NOTE_MAX_LENGTH) return 'too_long';
  return null;
}

export type CategoryPref = { category: string; position: number; hidden: boolean };

/**
 * Ordem final: as personalizadas na ordem escolhida (sem as ocultas); cada categoria sem preferência
 * (ex.: de outro modo) entra logo depois da vizinha anterior na ordem padrão — nunca enterrada no fim.
 */
export function orderCategories(visibleIds: readonly string[], prefs: readonly CategoryPref[]): string[] {
  const visible = new Set(visibleIds);
  const relevant = prefs.filter((p) => visible.has(p.category)).sort((a, b) => a.position - b.position);
  const result = relevant.filter((p) => !p.hidden).map((p) => p.category);
  const known = new Set(relevant.map((p) => p.category));

  visibleIds.forEach((id, index) => {
    if (known.has(id)) return;
    const previous = visibleIds.slice(0, index).reverse().find((candidate) => result.includes(candidate));
    result.splice(previous ? result.indexOf(previous) + 1 : 0, 0, id);
  });
  return result;
}

/** Lista para a tela Personalizar: visíveis na ordem de `orderCategories` e, no fim, as ocultas. */
export function orderForEditing(visibleIds: readonly string[], prefs: readonly CategoryPref[]): { id: string; hidden: boolean }[] {
  const hidden = new Set(prefs.filter((p) => p.hidden).map((p) => p.category));
  return [
    ...orderCategories(visibleIds, prefs).map((id) => ({ id, hidden: false })),
    ...visibleIds.filter((id) => hidden.has(id)).map((id) => ({ id, hidden: true })),
  ];
}
