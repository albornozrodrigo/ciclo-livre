import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { strToU8, zipSync } from 'fflate';

import { readZipEntry, ZipError } from '@/lib/zip/zip';

const JSON_TEXT = JSON.stringify([{ type: 'period', id: '1', date: '2024-04-28', value: { option: 'medium' } }]);
const isMeasurements = (name: string) => name.split('/').pop() === 'measurements.json';
const text = (b: Uint8Array) => new TextDecoder().decode(b);

async function makeZip(
  opts: { password?: string; zipCrypto?: boolean; level?: number },
  files: Record<string, string> = { 'ClueDataDownload/measurements.json': JSON_TEXT },
) {
  const writer = new ZipWriter(new BlobWriter('application/zip'), {
    useWebWorkers: false,
    level: opts.level ?? 6,
    password: opts.password,
    zipCrypto: opts.zipCrypto,
    encryptionStrength: 3,
  });
  for (const [name, content] of Object.entries(files)) await writer.add(name, new TextReader(content));
  const blob = await writer.close();
  return new Uint8Array(await blob.arrayBuffer());
}

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ZipError ? e.code : `outro: ${String(e)}`;
  }
  return 'sem erro';
};

describe('readZipEntry', () => {
  it('lê ZIP sem senha, achando o arquivo dentro de pasta', async () => {
    const zip = await makeZip({});
    expect(text(readZipEntry(zip, isMeasurements, { maxBytes: 1e6 }))).toBe(JSON_TEXT);
  });

  it('lê ZIP com senha AES-256 (padrão de apps atuais)', async () => {
    const zip = await makeZip({ password: 'Senha ç 123' });
    expect(text(readZipEntry(zip, isMeasurements, { password: 'Senha ç 123', maxBytes: 1e6 }))).toBe(JSON_TEXT);
    expect(code(() => readZipEntry(zip, isMeasurements, { password: 'errada', maxBytes: 1e6 }))).toBe('wrong_password');
    expect(code(() => readZipEntry(zip, isMeasurements, { maxBytes: 1e6 }))).toBe('password_required');
  });

  it('lê ZIP com senha ZipCrypto (padrão antigo)', async () => {
    const zip = await makeZip({ password: 'abc123', zipCrypto: true });
    expect(text(readZipEntry(zip, isMeasurements, { password: 'abc123', maxBytes: 1e6 }))).toBe(JSON_TEXT);
    expect(code(() => readZipEntry(zip, isMeasurements, { password: 'abd123', maxBytes: 1e6 }))).toBe('wrong_password');
  });

  it('arquivo guardado sem compressão também serve', async () => {
    const zip = await makeZip({ password: 'abc', level: 0 });
    expect(text(readZipEntry(zip, isMeasurements, { password: 'abc', maxBytes: 1e6 }))).toBe(JSON_TEXT);
  });

  it('recusa: não é ZIP, sem o arquivo, maior que o limite (bomba), dados adulterados', async () => {
    expect(code(() => readZipEntry(strToU8('não sou zip'), isMeasurements, { maxBytes: 1e6 }))).toBe('not_zip');
    const other = await makeZip({}, { 'outro.txt': 'x' });
    expect(code(() => readZipEntry(other, isMeasurements, { maxBytes: 1e6 }))).toBe('not_found');
    const bomb = zipSync({ 'measurements.json': new Uint8Array(5_000_000) });
    expect(bomb.length).toBeLessThan(50_000);
    expect(code(() => readZipEntry(bomb, isMeasurements, { maxBytes: 1_000_000 }))).toBe('too_large');

    const plain = zipSync({ 'measurements.json': strToU8(JSON_TEXT) }, { level: 0 });
    const tampered = plain.slice();
    const at = text(plain).indexOf('medium');
    tampered[at] = 'M'.charCodeAt(0);
    expect(code(() => readZipEntry(tampered, isMeasurements, { maxBytes: 1e6 }))).toBe('corrupt');

    const aes = await makeZip({ password: 'abc', level: 0 });
    const flipped = aes.slice();
    const dataStart = 30 + (aes[26] | (aes[27] << 8)) + (aes[28] | (aes[29] << 8));
    flipped[dataStart + 16 + 2 + 5] ^= 0xff; // depois do salt e do verificador: no conteúdo cifrado
    expect(['corrupt', 'wrong_password']).toContain(code(() => readZipEntry(flipped, isMeasurements, { password: 'abc', maxBytes: 1e6 })));
  });

  it('ZIP que mente o tamanho descompactado não estoura a memória: vira "corrupt"', () => {
    const z = zipSync({ 'measurements.json': new Uint8Array(5_000_000) });
    let cd = 0;
    for (let i = z.length - 22; i >= 0; i--) {
      if (z[i] === 0x50 && z[i + 1] === 0x4b && z[i + 2] === 1 && z[i + 3] === 2) {
        cd = i;
        break;
      }
    }
    z.set([100, 0, 0, 0], cd + 24);
    expect(code(() => readZipEntry(z, isMeasurements, { maxBytes: 100_000 }))).toBe('corrupt');
  });
});
