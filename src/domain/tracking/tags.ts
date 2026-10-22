export const TAG_MAX_LENGTH = 30;

export type TagNameResult = { ok: true; name: string } | { ok: false; error: 'empty' | 'too_long' | 'duplicate' };

/** Chave de comparação: sem acentos, minúsculas, espaços colapsados. */
export function normalizeTagKey(name: string): string {
  return name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Valida um nome de tag. Sem limite de quantidade (no app de referência era 5 no plano grátis). */
export function validateTagName(raw: string, existingNames: readonly string[]): TagNameResult {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length === 0) return { ok: false, error: 'empty' };
  if (name.length > TAG_MAX_LENGTH) return { ok: false, error: 'too_long' };
  const key = normalizeTagKey(name);
  if (existingNames.some((n) => normalizeTagKey(n) === key)) return { ok: false, error: 'duplicate' };
  return { ok: true, name };
}
