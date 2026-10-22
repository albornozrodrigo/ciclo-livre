import type { DayLog } from '@/db/log-repo';
import { categoryById } from '@/domain/tracking/catalog';
import { ptBR } from '@/i18n/pt-BR';

type Labels = Record<string, { label: string; options?: Record<string, string> }>;

/** Rótulos legíveis do que foi registrado num dia (opções, medições com unidade e "Nota do dia"). */
export function summarizeDay(day: DayLog): string[] {
  const labels = ptBR.tracking.categories as Labels;
  const items: string[] = [];
  for (const [categoryId, options] of Object.entries(day.selections)) {
    const categoryLabel = labels[categoryId]?.label ?? categoryId;
    // Escolha única é uma qualidade ("Forte", "Baixa"): sem o nome da categoria fica ambígua.
    const single = categoryById(categoryId)?.kind === 'single';
    for (const option of options) {
      const optionLabel = labels[categoryId]?.options?.[option] ?? option;
      items.push(single ? `${categoryLabel}: ${optionLabel}` : optionLabel);
    }
  }
  for (const [categoryId, value] of Object.entries(day.measures)) {
    const category = categoryById(categoryId);
    const unit = category?.kind === 'measure' ? ` ${category.unit}` : '';
    items.push(`${labels[categoryId]?.label ?? categoryId}: ${String(value).replace('.', ',')}${unit}`);
  }
  if (day.note) items.push(ptBR.tracking.note.label);
  return items;
}
