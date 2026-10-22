import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase, initOrClose } from './database';
import { getOrCreateDatabaseKey } from './key';
import { MIGRATIONS } from './migrations';

export const DATABASE_NAME = 'ciclo-livre.db';

const secretStore = {
  getItemAsync: (key: string) => SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
};

/** onInit do SQLiteProvider: liga as dependências reais do aparelho à inicialização testada. */
export function initAppDatabase(db: SQLiteDatabase): Promise<void> {
  return initOrClose(db, () =>
    initDatabase(db, {
      getKey: () => getOrCreateDatabaseKey(secretStore, getRandomBytes),
      migrations: MIGRATIONS,
    }),
  );
}
