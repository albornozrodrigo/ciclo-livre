import * as SecureStore from 'expo-secure-store';
import { deleteDatabaseAsync, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { eraseAllData } from './erase';
import { DATABASE_KEY_NAME } from './key';
import { DATABASE_NAME, initAppDatabase } from './open';

const ReopenContext = createContext<() => void>(() => {});

/** Provider do banco. Trocar a geração remonta o SQLiteProvider e abre um banco novo. */
export function DatabaseRoot({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState(0);
  const reopen = useCallback(() => setGeneration((g) => g + 1), []);

  return (
    <ReopenContext.Provider value={reopen}>
      <SQLiteProvider key={generation} databaseName={DATABASE_NAME} onInit={initAppDatabase}>
        {children}
      </SQLiteProvider>
    </ReopenContext.Provider>
  );
}

/** Apaga banco e chave do aparelho e reabre um banco vazio. */
export function useEraseAllData(): () => Promise<void> {
  const db = useSQLiteContext();
  const reopen = useContext(ReopenContext);

  return useCallback(async () => {
    await eraseAllData({
      closeDatabase: () => db.closeAsync(),
      deleteDatabase: () => deleteDatabaseAsync(DATABASE_NAME),
      deleteKey: () => SecureStore.deleteItemAsync(DATABASE_KEY_NAME),
    });
    reopen();
  }, [db, reopen]);
}
