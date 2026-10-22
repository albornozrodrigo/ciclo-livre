import type { DayLog } from '@/db/log-repo';
import { CATALOG } from '@/domain/tracking/catalog';
import { ptBR } from '@/i18n/pt-BR';

type Labels = Record<string, { label: string; options?: Record<string, string> }>;

/**
 * Rótulos legíveis do dia, na ordem do catálogo: "Categoria: opção, opção", medições com unidade
 * e "Nota do dia". O nome da categoria evita ambiguidades como "Bem" (pele? cabelo?).
 */
export function summarizeDay(day: DayLog): string[] {
  const labels = ptBR.tracking.categories as unknown as Labels;
  const items: string[] = [];
  for (const category of CATALOG) {
    const label = labels[category.id]?.label ?? category.id;
    if (category.kind === 'measure') {
      const value = day.measures[category.id];
      if (value !== undefined) items.push(`${label}: ${String(value).replace('.', ',')} ${category.unit}`);
      continue;
    }
    const chosen = category.options.filter((o) => day.selections[category.id]?.includes(o));
    if (chosen.length > 0) items.push(`${label}: ${chosen.map((o) => labels[category.id]?.options?.[o] ?? o).join(', ')}`);
  }
  if (day.note) items.push(ptBR.tracking.note.label);
  return items;
}
