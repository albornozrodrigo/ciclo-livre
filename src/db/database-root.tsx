import * as SecureStore from 'expo-secure-store';
import { deleteDatabaseAsync, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

import { log } from '@/lib/logger';
import { deleteApiKey } from '@/ai/key-store';
import { purgeExports } from '@/data-export/export-actions';
import { cancelAllReminders } from '@/reminders/sync';

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
    purgeExportFiles();
    try {
      await eraseAllData({
        cancelReminders: cancelAllReminders,
        onCancelError: logCancelError,
        closeDatabase: () => db.closeAsync(),
        deleteDatabase: deleteDatabaseFile,
        deleteKey: deleteDatabaseKey,
      });
    } finally {
      // Mesmo se falhar no meio, a conexão já pode estar fechada: reabrir evita um contexto inutilizável.
      reopen();
    }
  }, [db, reopen]);
}

const logCancelError = (error: unknown) => log.error('reminders_cancel_failed', error);

/** Temporários de exportação e a chave da IA também saem no "apagar tudo". */
function purgeExportFiles() {
  try {
    purgeExports();
  } catch (error) {
    log.error('export_purge_failed', error);
  }
  deleteApiKey().catch((error: unknown) => log.error('ai_key_delete_failed', error));
}
const deleteDatabaseFile = () => deleteDatabaseAsync(DATABASE_NAME);
const deleteDatabaseKey = () => SecureStore.deleteItemAsync(DATABASE_KEY_NAME);

/**
 * Saída da tela de erro quando o banco não abre (chave perdida, arquivo ilegível).
 * Não há conexão para fechar: initOrClose já fechou a da tentativa que falhou.
 */
export function resetUnopenableDatabase(): Promise<void> {
  purgeExportFiles();
  return eraseAllData({
    cancelReminders: cancelAllReminders,
    onCancelError: logCancelError,
    closeDatabase: async () => {},
    deleteDatabase: deleteDatabaseFile,
    deleteKey: deleteDatabaseKey,
  });
}
