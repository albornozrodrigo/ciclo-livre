import type { RandomBytes, SecretStore } from './types';

export const DATABASE_KEY_NAME = 'ciclo-livre.db-key.v1';

const KEY_BYTES = 32;
const KEY_PATTERN = /^[0-9a-f]{64}$/;

/** A chave guardada não tem o formato esperado. A mensagem nunca inclui o valor. */
export class InvalidStoredKeyError extends Error {
  constructor() {
    super('A chave do banco guardada no aparelho está em formato inválido.');
    this.name = 'InvalidStoredKeyError';
  }
}

export function isValidDatabaseKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Chamadas concorrentes no mesmo store compartilham a mesma promessa: sem isso, duas
// inicializações simultâneas poderiam gerar chaves diferentes e a última venceria.
const inFlight = new WeakMap<SecretStore, Promise<string>>();

/**
 * Devolve a chave do banco (64 hex), gerando 256 bits aleatórios no primeiro uso.
 * Um valor corrompido nunca é sobrescrito: isso tornaria o banco existente ilegível.
 */
export function getOrCreateDatabaseKey(store: SecretStore, randomBytes: RandomBytes): Promise<string> {
  const pending = inFlight.get(store);
  if (pending) return pending;
  const promise = readOrCreateKey(store, randomBytes).finally(() => inFlight.delete(store));
  inFlight.set(store, promise);
  return promise;
}

async function readOrCreateKey(store: SecretStore, randomBytes: RandomBytes): Promise<string> {
  const stored = await store.getItemAsync(DATABASE_KEY_NAME);
  if (stored !== null) {
    if (!isValidDatabaseKey(stored)) throw new InvalidStoredKeyError();
    return stored;
  }
  const key = toHex(randomBytes(KEY_BYTES));
  await store.setItemAsync(DATABASE_KEY_NAME, key);
  return key;
}
