import {
  isAppLocked,
  LOCK_AFTER_MS,
  markAppLocked,
  markBackground,
  shouldLockOnReturn,
  SUPPRESSED_MAX_MS,
  withLockSuppressed,
} from '@/security/lock-policy';

describe('lock-policy', () => {
  it('bloqueia ao voltar só depois de mais de 1 minuto fora (relógio que voltou também bloqueia)', () => {
    expect(LOCK_AFTER_MS).toBe(60_000);
    expect(shouldLockOnReturn(null, 1_000_000)).toBe(false);
    expect(shouldLockOnReturn({ at: 1_000_000, suppressed: false }, 1_060_000)).toBe(false);
    expect(shouldLockOnReturn({ at: 1_000_000, suppressed: false }, 1_060_001)).toBe(true);
    expect(shouldLockOnReturn({ at: 1_000_000, suppressed: false }, 900_000)).toBe(true);
  });

  it('saída por tela do sistema (PIN, seletor, compartilhar) ganha folga maior, mas com teto: horas fora sempre bloqueiam', () => {
    expect(SUPPRESSED_MAX_MS).toBe(5 * 60_000);
    expect(shouldLockOnReturn({ at: 0, suppressed: true }, 4 * 60_000)).toBe(false);
    expect(shouldLockOnReturn({ at: 0, suppressed: true }, 3 * 60 * 60_000)).toBe(true);
  });

  it('marca a saída como de sistema só enquanto a ação está em curso, mesmo com erro', async () => {
    expect(markBackground(10).suppressed).toBe(false);
    let during = markBackground(10);
    await withLockSuppressed(async () => {
      during = markBackground(20);
    });
    expect(during).toEqual({ at: 20, suppressed: true });
    await expect(
      withLockSuppressed(async () => {
        throw new Error('cancelado');
      }),
    ).rejects.toThrow('cancelado');
    expect(markBackground(30).suppressed).toBe(false);
  });

  it('expõe se o app está bloqueado (confirmações destrutivas consultam antes de agir)', () => {
    expect(isAppLocked()).toBe(false);
    markAppLocked(true);
    expect(isAppLocked()).toBe(true);
    markAppLocked(false);
    expect(isAppLocked()).toBe(false);
  });
});
