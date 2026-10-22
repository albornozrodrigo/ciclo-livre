export type Topic = 'ciclo' | 'menstruacao' | 'sintomas' | 'fertilidade' | 'fases';

export type Block = { kind: 'p'; text: string } | { kind: 'h'; text: string } | { kind: 'list'; items: string[] };

/** Artigo próprio do Ciclo Livre, empacotado no app (funciona sem rede). */
export type Article = {
  id: string;
  topic: Topic;
  title: string;
  /** Uma linha, até 140 caracteres. */
  summary: string;
  minutes: number;
  blocks: Block[];
  /** Fontes nomeadas (sem URL inventada). */
  sources: string[];
};

const MAX_RESULTS = 20;
const WEIGHT = { title: 10, summary: 4, body: 1 } as const;

/** Sem acento, minúsculo, espaços simples. */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const bodyText = (a: Article) => a.blocks.map((b) => (b.kind === 'list' ? b.items.join(' ') : b.text)).join(' ');

/**
 * Busca local por palavras (todas precisam aparecer), sem acento e sem maiúscula.
 * Pontua título > resumo > corpo; empate mantém a ordem original. Consulta vazia devolve todos.
 */
export function searchArticles(articles: readonly Article[], query: string): Article[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [...articles];
  const scored = articles.flatMap((article, index) => {
    const fields = { title: normalize(article.title), summary: normalize(article.summary), body: normalize(bodyText(article)) };
    let score = 0;
    for (const word of words) {
      const hit =
        (fields.title.includes(word) ? WEIGHT.title : 0) +
        (fields.summary.includes(word) ? WEIGHT.summary : 0) +
        (fields.body.includes(word) ? WEIGHT.body : 0);
      if (hit === 0) return [];
      score += hit;
    }
    return [{ article, score, index }];
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_RESULTS)
    .map((s) => s.article);
}
