import { log } from '@/lib/logger';

/**
 * Leitura interrompida porque o banco foi fechado (apagar tudo, tela de erro que desmonta o banco).
 * É cancelamento esperado, não falha: a próxima abertura refaz o trabalho.
 */
export function isDatabaseClosed(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Access to closed resource');
}

/** Loga a falha, exceto o cancelamento por banco fechado. */
export function logUnlessClosed(name: string, error: unknown): void {
  if (!isDatabaseClosed(error)) log.error(name, error);
}
