/** Tempo fora do app antes de pedir desbloqueio de novo. */
export const LOCK_AFTER_MS = 60_000;
/** Folga quando a saída foi para uma tela do sistema aberta pelo app (PIN, seletor, compartilhar); nunca infinita. */
export const SUPPRESSED_MAX_MS = 5 * 60_000;

/** Quando o app foi para o segundo plano e se foi por uma tela do sistema aberta por ele. */
export type Background = { at: number; suppressed: boolean };

/** Bloqueia ao voltar se ficou fora mais que o limite (relógio que voltou também bloqueia). */
export function shouldLockOnReturn(background: Background | null, now: number): boolean {
  if (!background) return false;
  const away = now - background.at;
  return away < 0 || away > (background.suppressed ? SUPPRESSED_MAX_MS : LOCK_AFTER_MS);
}

/** Ações em curso que abrem outra tela do sistema (o Android chama isso de "segundo plano"). */
let suppressed = 0;

/** Registra a saída do app agora. Uma ação que nunca termina só dá a folga máxima, não desliga a trava. */
export const markBackground = (now: number): Background => ({ at: now, suppressed: suppressed > 0 });

/** Envolve o PIN do aparelho, o seletor de arquivos, a tela de compartilhar e os pedidos de permissão. */
export async function withLockSuppressed<T>(task: () => Promise<T>): Promise<T> {
  suppressed += 1;
  try {
    return await task();
  } finally {
    suppressed -= 1;
  }
}

/** Estado atual da trava, para diálogos nativos (que ficam por cima da tela de bloqueio) não agirem bloqueados. */
let locked = false;
export const markAppLocked = (on: boolean) => {
  locked = on;
};
export const isAppLocked = () => locked;
