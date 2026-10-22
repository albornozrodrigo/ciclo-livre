import { buildCsv } from '@/domain/export/csv';

const labels = {
  category: (id: string) => (({ period: 'Menstruação', pain: 'Dor', weight: 'Peso' }) as Record<string, string>)[id] ?? id,
  option: (category: string, option: string) =>
    (({ 'pain:cramps': 'Cólica', 'pain:back': 'Costas', 'period:heavy': 'Intenso' }) as Record<string, string>)[`${category}:${option}`] ??
    option,
  date: 'Data',
  tags: 'Tags',
  note: 'Nota',
};

const data = {
  selections: [
    { date: '2026-10-12', category: 'pain', option: 'back' },
    { date: '2026-10-12', category: 'pain', option: 'cramps' },
    { date: '2026-10-12', category: 'period', option: 'heavy' },
  ],
  measures: [{ date: '2026-10-13', category: 'weight', value: 64.5 }],
  notes: [{ date: '2026-10-13', text: 'Dia "difícil",\ncom vírgula' }],
  dayTags: [{ date: '2026-10-13', tag: '=SOMA(A1)' }],
};

describe('buildCsv', () => {
  const csv = buildCsv(data, labels);
  const lines = csv.replace(/^﻿/, '').split('\r\n');

  it('começa com BOM UTF-8 e cabeçalho em pt-BR, categorias na ordem do catálogo', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]).toBe('Data;Menstruação;Dor;Peso;Tags;Nota');
  });

  it('separador ; (Excel em pt-BR); opções separadas por ", "; número com vírgula decimal sem aspas', () => {
    expect(lines[1]).toBe('2026-10-12;Intenso;Costas, Cólica;;;');
  });

  it('escapa aspas e quebras de linha e neutraliza fórmulas', () => {
    expect(lines[2]).toContain(';64,5;');
    expect(csv).toContain(`"'=SOMA(A1)"`);
    expect(csv).toContain('"Dia ""difícil"",\ncom vírgula"');
  });
});
