/** Um pedido pago por vez no app inteiro (resumo de artigos e chat dividem a mesma trava). */
let inFlight = false;

export async function withAiLock<T>(run: () => Promise<T>): Promise<T | { ok: false; error: 'busy' }> {
  if (inFlight) return { ok: false, error: 'busy' };
  inFlight = true;
  try {
    return await run();
  } finally {
    inFlight = false;
  }
}
