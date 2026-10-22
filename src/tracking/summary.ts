import type { DayLog } from '@/db/log-repo';
import { CATALOG } from '@/domain/tracking/catalog';
import { ptBR } from '@/i18n/pt-BR';
import { categoryLabels } from '@/i18n/pt-BR-tracking';

/**
 * Rótulos legíveis do dia, na ordem do catálogo: "Categoria: opção, opção", medições com unidade
 * e "Nota do dia". O nome da categoria evita ambiguidades como "Bem" (pele? cabelo?).
 */
export function summarizeDay(day: DayLog): string[] {
  const items: string[] = [];
  for (const category of CATALOG) {
    const { label, options } = categoryLabels(category.id);
    if (category.kind === 'measure') {
      const value = day.measures[category.id];
      if (value !== undefined) items.push(`${label}: ${String(value).replace('.', ',')} ${category.unit}`);
      continue;
    }
    const chosen = category.options.filter((o) => day.selections[category.id]?.includes(o));
    if (chosen.length > 0) items.push(`${label}: ${chosen.map((o) => options?.[o] ?? o).join(', ')}`);
  }
  if (day.note) items.push(ptBR.tracking.note.label);
  return items;
}
