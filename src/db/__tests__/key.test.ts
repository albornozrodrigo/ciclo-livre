import { DATABASE_KEY_NAME, getOrCreateDatabaseKey, InvalidStoredKeyError } from '@/db/key';
import type { RandomBytes, SecretStore } from '@/db/types';

function memoryStore(initial: Record<string, string> = {}): SecretStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItemAsync: async (k) => data[k] ?? null,
    setItemAsync: async (k, v) => {
      data[k] = v;
    },
  };
}

function countingRandom(): RandomBytes & { calls: number } {
  const fn = ((n: number) => {
    fn.calls += 1;
    return Uint8Array.from({ length: n }, (_, i) => (i * 7 + fn.calls) % 256);
  }) as RandomBytes & { calls: number };
  fn.calls = 0;
  return fn;
}

describe('getOrCreateDatabaseKey', () => {
  it('gera 32 bytes e guarda como 64 hex minúsculos no primeiro uso', async () => {
    const store = memoryStore();
    const random = countingRandom();

    const key = await getOrCreateDatabaseKey(store, random);

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(store.data[DATABASE_KEY_NAME]).toBe(key);
    expect(random.calls).toBe(1);
  });

  it('devolve a mesma chave nas chamadas seguintes sem gerar outra', async () => {
    const store = memoryStore();
    const random = countingRandom();

    const first = await getOrCreateDatabaseKey(store, random);
    const second = await getOrCreateDatabaseKey(store, random);

    expect(second).toBe(first);
    expect(random.calls).toBe(1);
  });

  it.each([['nao-e-hex'.padEnd(64, 'z')], ['abc123'], ['A'.repeat(64)]])(
    'recusa valor corrompido no store (%s) sem sobrescrever',
    async (corrupted) => {
      const store = memoryStore({ [DATABASE_KEY_NAME]: corrupted });

      await expect(getOrCreateDatabaseKey(store, countingRandom())).rejects.toBeInstanceOf(
        InvalidStoredKeyError,
      );
      expect(store.data[DATABASE_KEY_NAME]).toBe(corrupted);
    },
  );

  it('não inclui o valor guardado na mensagem de erro', async () => {
    const secret = 'segredo-que-nao-pode-vazar';
    const store = memoryStore({ [DATABASE_KEY_NAME]: secret });

    await expect(getOrCreateDatabaseKey(store, countingRandom())).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(secret) }),
    );
  });
});

describe('getOrCreateDatabaseKey com chamadas concorrentes', () => {
  it('gera e grava uma única chave quando duas chamadas correm juntas', async () => {
    const store = memoryStore();
    const random = countingRandom();

    const [a, b] = await Promise.all([
      getOrCreateDatabaseKey(store, random),
      getOrCreateDatabaseKey(store, random),
    ]);

    expect(a).toBe(b);
    expect(random.calls).toBe(1);
  });
});
