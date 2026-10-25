export const MESSAGE_LIMITS = { title: 40, body: 100 } as const;

type MessageError = "too_long";
export type MessageResult =
  | { ok: true; title: string | null; body: string | null }
  | { ok: false; errors: { title?: MessageError; body?: MessageError } };

/** Título e texto próprios do lembrete: aparados; vazio = usar o padrão (null). */
export function validateMessage(
  title: string | null,
  body: string | null,
): MessageResult {
  const t = title?.trim() || null;
  const b = body?.trim() || null;
  const errors: { title?: MessageError; body?: MessageError } = {};
  if (t && t.length > MESSAGE_LIMITS.title) errors.title = "too_long";
  if (b && b.length > MESSAGE_LIMITS.body) errors.body = "too_long";
  return errors.title || errors.body
    ? { ok: false, errors }
    : { ok: true, title: t, body: b };
}
