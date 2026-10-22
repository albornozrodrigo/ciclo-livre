import { log } from '@/lib/logger';

import { isValidDatabaseKey } from './key';
import { type Migration, runMigrations } from './migrations';
import type { SqlExecutor } from './types';

/** O build não tem SQLCipher (ex.: Expo Go): recusamos gravar dados de saúde em claro. */
export class DatabaseNotEncryptedError extends Error {
  constructor() {
    super('O banco de dados não está criptografado neste build.');
    this.name = 'DatabaseNotEncryptedError';
  }
}

export type InitDeps = {
  getKey: () => Promise<string>;
  migrations: Migration[];
};

/**
 * Prepara uma conexão recém-aberta: chave → prova de criptografia → foreign keys → migrations.
 * A chave nunca aparece em erros nem em logs.
 */
export async function initDatabase(db: SqlExecutor, { getKey, migrations }: InitDeps): Promise<void> {
  const key = await getKey();
  if (!isValidDatabaseKey(key)) {
    throw new Error('Chave do banco em formato inválido.');
  }
  // PRAGMA key não aceita parâmetro ligado; a chave é validada como 64 hex acima.
  await db.execAsync(`PRAGMA key = "x'${key}'"`);

  const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (!cipher?.cipher_version) throw new DatabaseNotEncryptedError();

  await db.execAsync('PRAGMA foreign_keys = ON');
  await runMigrations(db, migrations);
}

/**
 * Roda a inicialização e, se ela falhar, fecha a conexão antes de repropagar.
 * O expo-sqlite reaproveita conexões abertas do cache; uma conexão vazada impediria
 * apagar o arquivo depois e manteria o estado de chave da tentativa anterior.
 */
export async function initOrClose(db: { closeAsync: () => Promise<void> }, init: () => Promise<void>): Promise<void> {
  try {
    await init();
  } catch (error) {
    // O erro de init é o que importa; falha ao fechar é registrada, sem esconder o original.
    await db.closeAsync().catch((closeError: unknown) => log.error('db_close_after_init_failed', closeError));
    throw error;
  }
}
