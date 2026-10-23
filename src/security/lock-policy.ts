/** Tempo fora do app antes de pedir desbloqueio de novo. */
export const LOCK_AFTER_MS = 60_000;

/** Bloqueia ao voltar se ficou fora por mais que o limite (relógio que voltou também bloqueia). */
export function shouldLockOnReturn(backgroundAt: number | null, now: number): boolean {
  if (backgroundAt === null) return false;
  const away = now - backgroundAt;
  return away < 0 || away > LOCK_AFTER_MS;
}

/** Contador de ações em curso que abrem outra tela do sistema (o Android chama isso de "segundo plano"). */
let suppressed = 0;

export const isLockSuppressed = () => suppressed > 0;

/**
 * Envolve o PIN do aparelho, o seletor de arquivos, a tela de compartilhar e o pedido de permissão:
 * sair para elas não conta como sair do app.
 */
export async function withLockSuppressed<T>(task: () => Promise<T>): Promise<T> {
  suppressed += 1;
  try {
    return await task();
  } finally {
    suppressed -= 1;
  }
}
