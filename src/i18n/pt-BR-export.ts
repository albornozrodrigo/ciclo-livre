import type { CsvLabels } from '@/domain/export/csv';

import { categoryLabels } from './pt-BR-tracking';

/** Cabeçalho e opções da planilha em pt-BR (os mesmos rótulos da tela de registro). */
export const csvLabels: CsvLabels = {
  category: (id) => categoryLabels(id).label,
  option: (category, option) => categoryLabels(category).options?.[option] ?? option,
  date: 'Data',
  tags: 'Tags',
  note: 'Nota',
};
