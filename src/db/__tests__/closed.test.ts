import { isDatabaseClosed } from '@/db/closed';

describe('isDatabaseClosed', () => {
  it('reconhece a leitura interrompida porque o banco foi fechado (apagar tudo, tela de erro)', () => {
    expect(
      isDatabaseClosed(
        new Error("Call to function 'NativeStatement.finalizeAsync' has been rejected.\n→ Caused by: Access to closed resource"),
      ),
    ).toBe(true);
    expect(isDatabaseClosed(new Error('Access to closed resource'))).toBe(true);
  });

  it('qualquer outro erro continua sendo erro', () => {
    expect(isDatabaseClosed(new Error('SQLITE_BUSY'))).toBe(false);
    expect(isDatabaseClosed('Access to closed resource')).toBe(false);
    expect(isDatabaseClosed(null)).toBe(false);
  });
});
