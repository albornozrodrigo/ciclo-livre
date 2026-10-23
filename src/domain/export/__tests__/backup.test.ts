import { scryptAsync } from '@noble/hashes/scrypt.js';

import {
  BACKUP_ERROR,
  decryptBackup,
  DEFAULT_KDF,
  defaultScrypt,
  encryptBackup,
  generateBackupPassword,
  MIN_PASSWORD,
  passwordStrength,
  type Scrypt,
} from '@/domain/export/backup';

// Parâmetros leves só nos testes (no app, os do padrão).
const FAST = { N: 1024, r: 8, p: 1 };
const bytes = (n: number, fill: number) => new Uint8Array(n).fill(fill);
const random = (n: number) => bytes(n, 7);

describe('backup criptografado', () => {
  it('ida e volta com a senha certa', async () => {
    const file = await encryptBackup('{"a":1}', 'senha-forte!', { random, kdf: FAST });
    expect(await decryptBackup(file, 'senha-forte!')).toBe('{"a":1}');
  });

  it('o arquivo é um envelope versionado, sem o texto em claro', async () => {
    const file = await encryptBackup('{"segredo":"cólica"}', 'senha-forte!', { random, kdf: FAST });
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
    const file = await encryptBackup('{"a":1}', 'senha-forte!', { random, kdf: FAST });
    await expect(decryptBackup(file, 'outra-senha')).rejects.toThrow(BACKUP_ERROR);
  });

  it('arquivo adulterado: mesmo erro genérico', async () => {
    const envelope = JSON.parse(await encryptBackup('{"a":1}', 'senha-forte!', { random, kdf: FAST }));
    const data = envelope.data as string;
    envelope.data = (data[0] === 'A' ? 'B' : 'A') + data.slice(1);
    await expect(decryptBackup(JSON.stringify(envelope), 'senha-forte!')).rejects.toThrow(BACKUP_ERROR);
    await expect(decryptBackup('não é json', 'senha-forte!')).rejects.toThrow(BACKUP_ERROR);
  });

  it('recusa parâmetros de derivação fora da faixa (arquivo forjado para travar o app)', async () => {
    const envelope = JSON.parse(await encryptBackup('{"a":1}', 'senha-forte!', { random, kdf: FAST }));
    envelope.kdf.N = 2 ** 30;
    await expect(decryptBackup(JSON.stringify(envelope), 'senha-forte!')).rejects.toThrow(BACKUP_ERROR);
  });

  it(`senha com menos de ${MIN_PASSWORD} caracteres não cria backup`, async () => {
    expect(MIN_PASSWORD).toBe(12);
    await expect(encryptBackup('{}', 'Curta-1!abc', { random, kdf: FAST })).rejects.toThrow('Senha curta');
  });

  it('ao abrir, N acima de 2^16 é recusado (arquivo forjado deixaria o app calculando)', async () => {
    const envelope = JSON.parse(await encryptBackup('{"a":1}', 'senha-forte!', { random, kdf: FAST }));
    envelope.kdf.N = 2 ** 17;
    await expect(decryptBackup(JSON.stringify(envelope), 'senha-forte!')).rejects.toThrow(BACKUP_ERROR);
  });

  it('ao abrir, salt e nonce precisam ter o tamanho certo', async () => {
    const good = JSON.parse(await encryptBackup('{"a":1}', 'senha-forte!', { random, kdf: FAST }));
    const shortSalt = { ...good, kdf: { ...good.kdf, salt: btoa('abc') } };
    const shortNonce = { ...good, cipher: { ...good.cipher, nonce: btoa('abc') } };
    await expect(decryptBackup(JSON.stringify(shortSalt), 'senha-forte!')).rejects.toThrow(BACKUP_ERROR);
    await expect(decryptBackup(JSON.stringify(shortNonce), 'senha-forte!')).rejects.toThrow(BACKUP_ERROR);
  });
});

describe('generateBackupPassword', () => {
  it('20 caracteres sem ambíguos (0/O, 1/I), em 4 grupos: 100 bits', () => {
    let i = 0;
    const seq = (n: number) => Uint8Array.from({ length: n }, () => i++);
    const pass = generateBackupPassword(seq);
    expect(pass).toMatch(/^[2-9A-HJ-NP-Z]{5}(-[2-9A-HJ-NP-Z]{5}){3}$/);
    expect(pass).toBe('23456-789AB-CDEFG-HJKLM');
    expect(passwordStrength(pass)).toBe('great');
  });
});

describe('passwordStrength', () => {
  it('curta, aceitável, boa e forte', () => {
    expect(passwordStrength('abc')).toBe('short');
    expect(passwordStrength('Abcdefg1!xy')).toBe('short');
    expect(passwordStrength('abcdefghijkl')).toBe('good');
    expect(passwordStrength('Abcdefghij1!')).toBe('great');
    expect(passwordStrength('frase longa de senha')).toBe('great');
  });
  it('padrão novo: N = 2^15 (o app usa scrypt nativo)', () => {
    expect(DEFAULT_KDF).toEqual({ N: 2 ** 15, r: 8, p: 1 });
  });

  it('o scrypt é injetável (nativo no app) e recebe senha, salt e parâmetros do arquivo', async () => {
    const calls: { N: number; r: number; p: number; dkLen: number; saltLength: number }[] = [];
    const scrypt: Scrypt = async (password, salt, params) => {
      calls.push({ ...params, saltLength: salt.length });
      return scryptAsync(password, salt, params);
    };
    const file = await encryptBackup('{"a":1}', 'senha-forte!', { random, kdf: FAST, scrypt });
    await expect(decryptBackup(file, 'senha-forte!', { scrypt })).resolves.toBe('{"a":1}');
    expect(calls).toEqual([
      { ...FAST, dkLen: 32, saltLength: 16 },
      { ...FAST, dkLen: 32, saltLength: 16 },
    ]);
  });

  it('vetor da RFC 7914: o scrypt padrão (JS) dá o resultado de referência', async () => {
    const out = await defaultScrypt(new TextEncoder().encode('password'), new TextEncoder().encode('NaCl'), {
      N: 1024,
      r: 8,
      p: 16,
      dkLen: 64,
    });
    expect(Buffer.from(out).toString('hex')).toBe(
      'fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b3731622eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640',
    );
  });
});
