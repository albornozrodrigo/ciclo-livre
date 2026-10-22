import { CATALOG, categoryById, defaultVisibleCategories } from '@/domain/tracking/catalog';
import { ptBR } from '@/i18n/pt-BR';

describe('catálogo de categorias', () => {
  it('tem pelo menos 40 categorias', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(40);
  });

  it('ids de categoria são únicos', () => {
    const ids = CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('opções são únicas dentro de cada categoria e não vazias', () => {
    for (const category of CATALOG) {
      if (category.kind === 'measure') continue;
      expect(category.options.length).toBeGreaterThan(0);
      expect(new Set(category.options).size).toBe(category.options.length);
    }
  });

  it('toda categoria e toda opção têm rótulo em pt-BR', () => {
    const labels = ptBR.tracking.categories as Record<string, { label: string; options?: Record<string, string> }>;
    const missing: string[] = [];
    for (const category of CATALOG) {
      if (!labels[category.id]?.label) missing.push(category.id);
      if (category.kind === 'measure') continue;
      for (const option of category.options) {
        if (!labels[category.id]?.options?.[option]) missing.push(`${category.id}.${option}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('medições têm faixa e unidade', () => {
    for (const category of CATALOG.filter((c) => c.kind === 'measure')) {
      expect(category.kind === 'measure' && category.min < category.max).toBe(true);
    }
  });
});

describe('visibilidade padrão por modo', () => {
  const visible = (...args: Parameters<typeof defaultVisibleCategories>) => defaultVisibleCategories(...args).map((c) => c.id);

  it('modo menstruação mostra fluxo e esconde gravidez', () => {
    const ids = visible('period', null);
    expect(ids).toContain('period');
    expect(ids).not.toContain('pregnancy_movements');
  });

  it('gravidez mostra categorias de gravidez e esconde fluxo e coleta', () => {
    const ids = visible('pregnancy', null);
    expect(ids).toContain('pregnancy_movements');
    expect(ids).not.toContain('period');
    expect(ids).not.toContain('collection_method');
  });

  it('sem sangramento esconde fluxo', () => {
    expect(visible('no_bleeding', null)).not.toContain('period');
  });

  it('perimenopausa mostra ondas de calor', () => {
    expect(visible('perimenopause', null)).toContain('hot_flashes');
  });

  it('mostra só a contracepção do método do perfil', () => {
    const ids = visible('period', 'pill');
    expect(ids).toContain('bc_pill');
    expect(ids).not.toContain('bc_ring');
  });

  it('sem método informado, nenhuma categoria de contracepção', () => {
    expect(visible('period', null).filter((id) => id.startsWith('bc_'))).toEqual([]);
  });

  it('categoryById encontra e falha para id desconhecido', () => {
    expect(categoryById('period')?.kind).toBe('single');
    expect(categoryById('nao_existe')).toBeUndefined();
  });
});
