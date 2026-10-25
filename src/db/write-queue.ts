/**
 * Fila de escritas por conexão. O `withTransactionAsync` do expo-sqlite não é exclusivo: duas
 * gravações simultâneas abririam BEGIN dentro de BEGIN e o ROLLBACK de uma desfaria a outra.
 * (`withExclusiveTransactionAsync` está proibido: abre outra conexão, sem a chave do SQLCipher.)
 */
const tails = new WeakMap<object, Promise<unknown>>();

export function enqueueWrite<T>(db: object, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(db) ?? Promise.resolve();
  // Uma escrita que falhou não impede as próximas.
  const run = previous.catch(() => undefined).then(task);
  tails.set(
    db,
    run.catch(() => undefined),
  );
  return run;
}
