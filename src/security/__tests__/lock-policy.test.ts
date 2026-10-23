import { isLockSuppressed, LOCK_AFTER_MS, shouldLockOnReturn, withLockSuppressed } from '@/security/lock-policy';

describe('lock-policy', () => {
  it('bloqueia ao voltar só depois de mais de 1 minuto fora', () => {
    expect(LOCK_AFTER_MS).toBe(60_000);
    expect(shouldLockOnReturn(null, 1_000_000)).toBe(false);
    expect(shouldLockOnReturn(1_000_000, 1_000_000 + 60_000)).toBe(false);
    expect(shouldLockOnReturn(1_000_000, 1_000_000 + 60_001)).toBe(true);
    // Relógio voltou: na dúvida, bloqueia.
    expect(shouldLockOnReturn(1_000_000, 900_000)).toBe(true);
  });

  it('suspende enquanto o app abre outra tela do sistema (PIN, seletor, compartilhar) e volta ao normal depois, mesmo com erro', async () => {
    expect(isLockSuppressed()).toBe(false);
    let during = false;
    await withLockSuppressed(async () => {
      during = isLockSuppressed();
    });
    expect(during).toBe(true);
    expect(isLockSuppressed()).toBe(false);
    await expect(
      withLockSuppressed(async () => {
        throw new Error('cancelado');
      }),
    ).rejects.toThrow('cancelado');
    expect(isLockSuppressed()).toBe(false);
  });

  it('chamadas aninhadas só liberam no fim da última', async () => {
    await withLockSuppressed(async () => {
      await withLockSuppressed(async () => undefined);
      expect(isLockSuppressed()).toBe(true);
    });
    expect(isLockSuppressed()).toBe(false);
  });
});
