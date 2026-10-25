import { DatabaseNotEncryptedError, initDatabase, initOrClose } from '@/db/database';
import type { Migration } from '@/db/migrations';
import type { SqlExecutor } from '@/db/types';

const KEY = 'ab'.repeat(32);

/** Executor espião: registra a ordem das instruções e responde aos PRAGMAs de leitura. */
function spyExecutor(opts: { cipherVersion: string | null }) {
  const log: string[] = [];
  let userVersion = 0;
  const db: SqlExecutor = {
    execAsync: async (sql) => {
      log.push(sql);
      const m = /PRAGMA user_version = (\d+)/.exec(sql);
      if (m) userVersion = Number(m[1]);
    },
    getFirstAsync: async <T>(sql: string) => {
      log.push(sql);
      if (sql === 'PRAGMA cipher_version') {
        return (opts.cipherVersion === null ? null : { cipher_version: opts.cipherVersion }) as T | null;
      }
      if (sql === 'PRAGMA user_version') return { user_version: userVersion } as T;
      return null;
    },
    withTransactionAsync: async (task) => task(),
    getAllAsync: async () => [],
    runAsync: async (sql) => {
      log.push(sql);
    },
  };
  return { db, log };
}

const migrations: Migration[] = [{ version: 1, statements: ['CREATE TABLE t (id INTEGER)'] }];

describe('initDatabase', () => {
  it('aplica a chave antes de qualquer outra instrução', async () => {
    const { db, log } = spyExecutor({ cipherVersion: '4.6.1 community' });

    await initDatabase(db, { getKey: async () => KEY, migrations });

    expect(log[0]).toBe(`PRAGMA key = "x'${KEY}'"`);
  });

  it('verifica o SQLCipher, liga foreign_keys e só então migra', async () => {
    const { db, log } = spyExecutor({ cipherVersion: '4.6.1 community' });

    await initDatabase(db, { getKey: async () => KEY, migrations });

    const at = (s: string) => log.findIndex((l) => l.startsWith(s));
    expect(at('PRAGMA cipher_version')).toBeGreaterThan(at('PRAGMA key'));
    expect(at('PRAGMA foreign_keys = ON')).toBeGreaterThan(at('PRAGMA cipher_version'));
    expect(at('CREATE TABLE t')).toBeGreaterThan(at('PRAGMA foreign_keys = ON'));
  });

  it.each([[null], ['']])('falha sem migrar quando cipher_version é %p', async (cipherVersion) => {
    const { db, log } = spyExecutor({ cipherVersion });

    await expect(initDatabase(db, { getKey: async () => KEY, migrations })).rejects.toBeInstanceOf(DatabaseNotEncryptedError);
    expect(log.some((l) => l.startsWith('CREATE TABLE'))).toBe(false);
  });

  it('recusa chave fora do formato sem executar nada e sem expor a chave', async () => {
    const { db, log } = spyExecutor({ cipherVersion: '4.6.1' });
    const evil = `${'a'.repeat(60)}'"; DROP TABLE x; --`;

    const error = await initDatabase(db, { getKey: async () => evil, migrations }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(evil);
    expect(log).toEqual([]);
  });
});

describe('initOrClose', () => {
  it('fecha a conexão e repropaga o erro quando a inicialização falha', async () => {
    const failure = new Error('falhou');
    const close = jest.fn().mockResolvedValue(undefined);

    await expect(initOrClose({ closeAsync: close }, async () => Promise.reject(failure))).rejects.toBe(failure);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('não fecha a conexão quando a inicialização dá certo', async () => {
    const close = jest.fn().mockResolvedValue(undefined);

    await initOrClose({ closeAsync: close }, async () => {});

    expect(close).not.toHaveBeenCalled();
  });

  it('repropaga o erro original mesmo se fechar também falhar', async () => {
    const failure = new Error('init');

    await expect(initOrClose({ closeAsync: () => Promise.reject(new Error('close')) }, () => Promise.reject(failure))).rejects.toBe(
      failure,
    );
  });
});
