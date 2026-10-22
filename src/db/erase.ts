export type EraseDeps = {
  /** Cancela notificações agendadas: nenhum lembrete pode disparar depois que os dados somem. */
  cancelReminders: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  deleteDatabase: () => Promise<void>;
  deleteKey: () => Promise<void>;
};

/**
 * Apaga todos os dados do aparelho. A chave sai por último: se o arquivo não puder
 * ser apagado, mantê-la evita um banco órfão que nunca mais abriria.
 * Falha ao cancelar lembretes não impede o apagamento, mas é avisada no fim.
 */
export async function eraseAllData({ cancelReminders, closeDatabase, deleteDatabase, deleteKey }: EraseDeps): Promise<void> {
  let cancelError: unknown = null;
  try {
    await cancelReminders();
  } catch (error) {
    cancelError = error;
  }
  await closeDatabase();
  await deleteDatabase();
  await deleteKey();
  if (cancelError) throw cancelError;
}
