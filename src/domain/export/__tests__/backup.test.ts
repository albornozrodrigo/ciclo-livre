import { BACKUP_ERROR, decryptBackup, encryptBackup, MIN_PASSWORD, passwordStrength } from '@/domain/export/backup';

// Parâmetros leves só nos testes (no app, os do padrão).
const FAST = { N: 1024, r: 8, p: 1 };
const bytes = (n: number, fill: number) => new Uint8Array(n).fill(fill);
const random = (n: number) => bytes(n, 7);

describe('backup criptografado', () => {
  it('ida e volta com a senha certa', async () => {
    const file = await encryptBackup('{"a":1}', 'senha-forte', { random, kdf: FAST });
    expect(await decryptBackup(file, 'senha-forte')).toBe('{"a":1}');
  });

  it('o arquivo é um envelope versionado, sem o texto em claro', async () => {
    const file = await encryptBackup('{"segredo":"cólica"}', 'senha-forte', { random, kdf: FAST });
    const envelope = JSON.parse(file);
    expect(envelope).toMatchObject({
      format: 'ciclo-livre-backup',
      version: 1,
      kdf: { name: 'scrypt', ...FAST },
      cipher: { name: 'aes-256-gcm' },
    });
    expect(file).not.toContain('cólica');
    expect(file).not.toContain('segredo');
  });

  it('senha errada: erro genérico', async () => {
    const file = await encryptBackup('{"a":1}', 'senha-forte', { random, kdf: FAST });
    await expect(decryptBackup(file, 'outra-senha')).rejects.toThrow(BACKUP_ERROR);
  });

  it('arquivo adulterado: mesmo erro genérico', async () => {
    const envelope = JSON.parse(await encryptBackup('{"a":1}', 'senha-forte', { random, kdf: FAST }));
    const data = envelope.data as string;
    envelope.data = (data[0] === 'A' ? 'B' : 'A') + data.slice(1);
    await expect(decryptBackup(JSON.stringify(envelope), 'senha-forte')).rejects.toThrow(BACKUP_ERROR);
    await expect(decryptBackup('não é json', 'senha-forte')).rejects.toThrow(BACKUP_ERROR);
  });

  it('recusa parâmetros de derivação fora da faixa (arquivo forjado para travar o app)', async () => {
    const envelope = JSON.parse(await encryptBackup('{"a":1}', 'senha-forte', { random, kdf: FAST }));
    envelope.kdf.N = 2 ** 30;
    await expect(decryptBackup(JSON.stringify(envelope), 'senha-forte')).rejects.toThrow(BACKUP_ERROR);
  });

  it(`senha com menos de ${MIN_PASSWORD} caracteres não cria backup`, async () => {
    await expect(encryptBackup('{}', 'curta', { random, kdf: FAST })).rejects.toThrow('Senha curta');
  });
});

describe('passwordStrength', () => {
  it('curta, aceitável, boa e forte', () => {
    expect(passwordStrength('abc')).toBe('short');
    expect(passwordStrength('abcdefgh')).toBe('ok');
    expect(passwordStrength('Abcdefg1!')).toBe('good');
    expect(passwordStrength('frase longa de senha')).toBe('great');
  });
});
