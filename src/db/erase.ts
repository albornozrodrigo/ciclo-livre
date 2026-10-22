export type EraseDeps = {
  closeDatabase: () => Promise<void>;
  deleteDatabase: () => Promise<void>;
  deleteKey: () => Promise<void>;
};

/**
 * Apaga todos os dados do aparelho. A chave sai por último: se o arquivo não puder
 * ser apagado, mantê-la evita um banco órfão que nunca mais abriria.
 */
export async function eraseAllData({ closeDatabase, deleteDatabase, deleteKey }: EraseDeps): Promise<void> {
  await closeDatabase();
  await deleteDatabase();
  await deleteKey();
}
