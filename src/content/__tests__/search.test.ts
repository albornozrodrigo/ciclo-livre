import { type Article, searchArticles } from '@/content/search';

const art = (id: string, title: string, summary: string, body: string): Article => ({
  id,
  topic: 'ciclo',
  title,
  summary,
  minutes: 3,
  blocks: [{ kind: 'p', text: body }],
  sources: ['Fonte'],
});

const list = [
  art('a', 'Cólica menstrual', 'O que ajuda na dor', 'Calor local e movimento.'),
  art('b', 'Fase lútea', 'Depois da ovulação', 'Às vezes vem com cólica leve.'),
  art('c', 'Sono e ciclo', 'Dormir mal muda tudo', 'Sem relação com dor.'),
];

describe('searchArticles', () => {
  it('ignora acento e maiúscula', () => {
    expect(searchArticles(list, 'COLICA').map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('título pesa mais que resumo, que pesa mais que corpo', () => {
    const items = [art('x', 'Outro', 'Fala de ovulação', ''), art('y', 'Ovulação', '', ''), art('z', 'Outro', '', 'ovulação no corpo')];
    expect(searchArticles(items, 'ovulacao').map((a) => a.id)).toEqual(['y', 'x', 'z']);
  });

  it('todas as palavras precisam aparecer', () => {
    expect(searchArticles(list, 'colica calor').map((a) => a.id)).toEqual(['a']);
  });

  it('consulta vazia devolve todos na ordem original; máximo de 20', () => {
    expect(searchArticles(list, '  ').map((a) => a.id)).toEqual(['a', 'b', 'c']);
    const many = Array.from({ length: 30 }, (_, i) => art(`m${i}`, 'Ciclo', '', ''));
    expect(searchArticles(many, 'ciclo')).toHaveLength(20);
  });

  it('busca também em subtítulos e itens de lista', () => {
    const item: Article = {
      ...art('l', 'Título', '', ''),
      blocks: [
        { kind: 'h', text: 'Quando procurar ajuda' },
        { kind: 'list', items: ['Febre alta'] },
      ],
    };
    expect(searchArticles([item], 'febre').map((a) => a.id)).toEqual(['l']);
  });
});
