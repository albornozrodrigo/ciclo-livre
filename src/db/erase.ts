export type EraseDeps = {
  /** Cancela notificações agendadas: nenhum lembrete pode disparar depois que os dados somem. */
  cancelReminders: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  deleteDatabase: () => Promise<void>;
  deleteKey: () => Promise<void>;
  /** Falha ao cancelar lembretes: registrada, mas não impede nem desfaz o apagamento. */
  onCancelError?: (error: unknown) => void;
};

/**
 * Apaga todos os dados do aparelho. A chave sai por último: se o arquivo não puder
 * ser apagado, mantê-la evita um banco órfão que nunca mais abriria.
 * Falha ao cancelar lembretes não impede o apagamento: os dados somem do mesmo jeito, e a falha vai
 * para `onCancelError` (os lembretes restantes não têm texto de saúde visível na tela de bloqueio).
 */
export async function eraseAllData({ cancelReminders, closeDatabase, deleteDatabase, deleteKey, onCancelError }: EraseDeps): Promise<void> {
  try {
    await cancelReminders();
  } catch (error) {
    onCancelError?.(error);
  }
  await closeDatabase();
  await deleteDatabase();
  await deleteKey();
}
