import { buildCsv } from '@/domain/export/csv';
import { csvLabels } from '@/i18n/pt-BR-export';

describe('csvLabels', () => {
  it('usa os mesmos rótulos da tela de registro', () => {
    const csv = buildCsv(
      { selections: [{ date: '2026-10-12', category: 'pain', option: 'cramps' }], measures: [], notes: [], dayTags: [] },
      csvLabels,
    );
    expect(csv).toContain('Data,Dor,Tags,Nota');
    expect(csv).toContain('2026-10-12,Cólica,,');
  });
});
