/**
 * Texto da pessoa (pergunta, nota, busca) vai ao modelo como dado. Este é o único limpador dos três usos:
 * - normaliza (NFKC), para que variantes como "＜" e "﹤" virem "<" e sejam tratadas igual;
 * - troca controles (C0/C1) por espaço e tira caracteres invisíveis (bidi, largura zero), que fariam a
 *   prévia ler diferente do que vai;
 * - tira só marcação de verdade (<dados>, </pergunta>), e "<"/">" soltos viram "‹"/"›" em vez de cortar o resto.
 */
export function sanitizeForPrompt(text: string, max: number): string {
  return text
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\p{Cf}/gu, '')
    .replace(/<\/?\s*[a-z][^<>]*>/gi, ' ')
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
