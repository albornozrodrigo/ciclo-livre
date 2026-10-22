import { ARTICLES } from '@/content/articles';
import { normalize, searchArticles } from '@/content/search';

describe('artigos', () => {
  it('ids únicos, temas válidos e pelo menos 15 artigos', () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(ARTICLES.length);
    for (const a of ARTICLES) expect(['ciclo', 'menstruacao', 'sintomas', 'fertilidade', 'fases']).toContain(a.topic);
  });

  it.each(ARTICLES.map((a) => [a.id, a] as const))('%s: título, resumo curto, corpo e fontes', (_id, a) => {
    expect(a.title.trim()).not.toBe('');
    expect(a.summary.length).toBeGreaterThan(10);
    expect(a.summary.length).toBeLessThanOrEqual(140);
    expect(a.minutes).toBeGreaterThan(0);
    expect(a.blocks.length).toBeGreaterThan(2);
    expect(a.sources.length).toBeGreaterThan(0);
    for (const b of a.blocks) {
      if (b.kind === 'list') expect(b.items.every((i) => i.trim().length > 0)).toBe(true);
      else expect(b.text.trim()).not.toBe('');
    }
    // Sem link inventado e sem marcação que a tela não renderiza.
    expect(JSON.stringify(a)).not.toMatch(/https?:|\*\*/);
  });

  it('janela fértil e contracepção dizem que o app não é contraceptivo', () => {
    for (const id of ['janela-fertil', 'contracepcao']) {
      const a = ARTICLES.find((x) => x.id === id)!;
      expect(normalize(JSON.stringify(a))).toContain('nao e metodo contraceptivo');
    }
  });

  it('busca real: "colica" acha o artigo de cólica primeiro', () => {
    expect(searchArticles(ARTICLES, 'colica')[0].id).toBe('colica');
  });
});
