import type { SqlExecutor } from './types';

export type Migration = {
  /** Inteiro positivo, estritamente crescente na lista. Vira o PRAGMA user_version. */
  version: number;
  /** SQL estático (nunca montado com dados da pessoa usuária). */
  statements: string[];
};

/** Histórico de schema do app. Só acrescente no fim; nunca edite uma versão publicada. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: ['CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) STRICT'],
  },
];

function assertWellFormed(migrations: Migration[]) {
  let previous = 0;
  for (const { version } of migrations) {
    if (!Number.isInteger(version) || version <= previous) {
      throw new Error('Lista de migrations inválida: versões devem ser inteiros positivos e crescentes.');
    }
    previous = version;
  }
}

/** Aplica, em ordem e cada uma numa transação, as migrations acima do user_version atual. */
export async function runMigrations(db: SqlExecutor, migrations: Migration[]): Promise<void> {
  assertWellFormed(migrations);
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  const latest = migrations.at(-1)?.version ?? 0;
  if (current > latest) {
    // Banco criado por uma versão mais nova do app: abrir com código antigo arrisca corromper dados.
    throw new Error('O banco foi criado por uma versão mais nova do app.');
  }

  for (const migration of migrations) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      // version é inteiro validado acima; PRAGMA não aceita parâmetro ligado.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
