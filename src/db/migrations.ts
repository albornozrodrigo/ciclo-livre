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
  {
    // Perfil do onboarding: linha única (id = 1). CHECKs espelham src/domain/profile.ts.
    version: 2,
    statements: [
      `CREATE TABLE profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        birth_year INTEGER NOT NULL CHECK (birth_year BETWEEN 1900 AND 2100),
        mode TEXT NOT NULL CHECK (mode IN ('period','no_bleeding','conceive','pregnancy','perimenopause')),
        last_period_start TEXT CHECK (last_period_start GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        period_length INTEGER NOT NULL CHECK (period_length BETWEEN 1 AND 15),
        cycle_length INTEGER NOT NULL CHECK (cycle_length BETWEEN 15 AND 90),
        regularity TEXT NOT NULL CHECK (regularity IN ('regular','irregular','unknown')),
        due_date TEXT CHECK (due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        trying_since TEXT CHECK (trying_since IN ('lt_1m','1_3m','4_6m','7_9m','10_12m','gt_12m')),
        birth_control TEXT CHECK (birth_control IN ('none','pill','iud_hormonal','iud_copper','implant','injection','ring','patch','condom','other','prefer_not_to_say')),
        updated_at TEXT NOT NULL
      ) STRICT`,
    ],
  },
  {
    // Registro diário. Ids de categoria/opção vêm do catálogo (validados no repositório).
    version: 3,
    statements: [
      `CREATE TABLE log_selection (
        date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        category TEXT NOT NULL,
        option TEXT NOT NULL,
        PRIMARY KEY (date, category, option)
      ) STRICT`,
      `CREATE TABLE log_measure (
        date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        category TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (date, category)
      ) STRICT`,
      `CREATE TABLE log_note (
        date TEXT PRIMARY KEY NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 1000)
      ) STRICT`,
      `CREATE TABLE category_pref (
        category TEXT PRIMARY KEY NOT NULL,
        position INTEGER NOT NULL CHECK (position >= 0),
        hidden INTEGER NOT NULL CHECK (hidden IN (0, 1))
      ) STRICT`,
    ],
  },
  {
    // Tags próprias, ilimitadas. `key` (normalizado) garante unicidade sem acento/maiúscula.
    version: 4,
    statements: [
      `CREATE TABLE tag (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 30),
        key TEXT NOT NULL UNIQUE
      ) STRICT`,
      `CREATE TABLE log_tag (
        date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        tag_id INTEGER NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
        PRIMARY KEY (date, tag_id)
      ) STRICT`,
    ],
  },
  {
    // Lembretes: uma linha por tipo (sem linha = padrão desligado). `options` é JSON validado no repositório.
    version: 5,
    statements: [
      `CREATE TABLE reminder (
        kind TEXT PRIMARY KEY NOT NULL,
        enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
        time TEXT NOT NULL CHECK (time GLOB '[0-2][0-9]:[0-5][0-9]'),
        options TEXT NOT NULL,
        title TEXT CHECK (title IS NULL OR length(title) BETWEEN 1 AND 40),
        body TEXT CHECK (body IS NULL OR length(body) BETWEEN 1 AND 100)
      ) STRICT`,
    ],
  },
  {
    // Conversa do chat com os dados: só no aparelho, cifrada como o resto.
    version: 6,
    statements: [
      `CREATE TABLE chat_message (
        id INTEGER PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 4000),
        created_at TEXT NOT NULL
      ) STRICT`,
    ],
  },
  {
    // Valor que o Health Connect gravou em cada dia e categoria: reimportar atualiza só o que ainda é dele.
    version: 7,
    statements: [
      `CREATE TABLE health_origin (
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (date, category)
      ) STRICT`,
    ],
  },
  {
    // Fase lútea informada pela pessoa (opcional).
    version: 8,
    statements: ['ALTER TABLE profile ADD COLUMN luteal_length INTEGER CHECK (luteal_length IS NULL OR luteal_length BETWEEN 9 AND 18)'],
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
