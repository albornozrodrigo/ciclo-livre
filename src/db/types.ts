/** Armazenamento seguro de segredos (no app: expo-secure-store). */
export interface SecretStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}

/** Fonte de bytes aleatórios criptograficamente seguros (no app: expo-crypto). */
export type RandomBytes = (byteCount: number) => Uint8Array;

export type SqlParam = string | number | null;

/** Subconjunto do SQLiteDatabase (expo-sqlite) que o código de banco usa. */
export interface SqlExecutor {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string, ...params: SqlParam[]): Promise<T | null>;
  /** Instrução com parâmetros ligados (`?`): dados nunca entram no texto do SQL. */
  runAsync(source: string, ...params: SqlParam[]): Promise<unknown>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
