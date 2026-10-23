import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { strToU8 } from 'fflate';

import { ClueReadError, readClueBytes } from '@/domain/clue/read';

const SAMPLE = JSON.stringify([
  { type: 'period', id: 'a1', date: '2024-05-02', value: { option: 'heavy' } },
  { type: 'period', id: 'a0', date: '2024-04-28', value: { option: 'light' } },
  { type: 'period', id: 'a2', date: '2024-05-06', value: { option: 'none' } },
  { type: 'feelings', id: 'b1', date: '2024-04-29', value: [{ option: 'sad' }] },
]);

async function clueZip(password: string) {
  const writer = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false, password });
  await writer.add('ClueDataDownload-2024-05-10/measurements.json', new TextReader(SAMPLE));
  await writer.add('ClueDataDownload-2024-05-10/profile.json', new TextReader('{"profileData":{}}'));
  return new Uint8Array(await (await writer.close()).arrayBuffer());
}

const reason = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e instanceof ClueReadError ? e.reason : `outro: ${String(e)}`;
  }
  return 'sem erro';
};

describe('readClueBytes', () => {
  it('ZIP do Clue: pede a senha, recusa a errada, lê com a certa', async () => {
    const zip = await clueZip('k9Xq-2pLm');
    expect(await readClueBytes(zip)).toEqual({ kind: 'needs_password' });
    expect(await reason(readClueBytes(zip, 'errada'))).toBe('wrong_password');
    const out = await readClueBytes(zip, 'k9Xq-2pLm');
    expect(out.kind).toBe('ready');
    if (out.kind === 'ready') expect(out.data.selections.filter((s) => s.category === 'period')).toHaveLength(2);
  });

  it('measurements.json solto também serve', async () => {
    const out = await readClueBytes(strToU8(SAMPLE));
    expect(out).toMatchObject({ kind: 'ready', invalid: 0, data: { days: 3 } });
  });

  it('tags demais (arquivo forjado) viram "grande demais", sem travar', async () => {
    const recs = Array.from({ length: 30 }, (_, k) => ({
      type: 'tags',
      id: `t${k}`,
      date: `2024-03-${String(k + 1).padStart(2, '0')}`,
      value: Array.from({ length: 40 }, (_, i) => ({ option: `tag-${k}-${i}` })),
    }));
    expect(await reason(readClueBytes(strToU8(JSON.stringify(recs))))).toBe('too_large');
  });

  it('recusa o que não é do Clue ou está vazio', async () => {
    expect(await reason(readClueBytes(strToU8('{"format":"ciclo-livre"}')))).toBe('not_clue');
    expect(await reason(readClueBytes(strToU8('[]')))).toBe('empty');
    expect(await reason(readClueBytes(strToU8('[{"x":1}]')))).toBe('empty');
    expect(await reason(readClueBytes(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])))).toBe('not_clue');
  });
});
