import type { SqlExecutor } from './types';

/**
 * Grava uma chave em `app_meta` (configurações do aparelho). Não passa pela fila de escrita:
 * quem chama decide (`enqueueWrite` sozinho ou dentro de uma transação).
 */
export const writeMeta = (db: SqlExecutor, key: string, value: string) =>
  db.runAsync('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', key, value);
