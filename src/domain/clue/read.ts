import { strFromU8 } from 'fflate';

import { readZipEntry, ZipError } from '@/lib/zip/zip';

import { CLUE_LIMITS, type ClueImport, ClueFormatError, mapClue, parseClueMeasurements } from './clue';

export type ClueReadReason = 'not_clue' | 'wrong_password' | 'too_large' | 'empty';

/** Motivo pronto para a tela escolher a mensagem; sem detalhe interno. */
export class ClueReadError extends Error {
  constructor(readonly reason: ClueReadReason) {
    super(reason);
  }
}

export type ClueRead = { kind: 'needs_password' } | { kind: 'ready'; data: ClueImport; invalid: number };

const isMeasurements = (name: string) => name.split('/').pop() === 'measurements.json';

/** Lê o ZIP do Clue (com a senha) ou o measurements.json solto. Só lê: não grava nada. */
export async function readClueBytes(bytes: Uint8Array, password?: string): Promise<ClueRead> {
  if (bytes.length > CLUE_LIMITS.bytes) throw new ClueReadError('too_large');
  let json = bytes;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      json = readZipEntry(bytes, isMeasurements, { password, maxBytes: CLUE_LIMITS.bytes });
    } catch (e) {
      if (!(e instanceof ZipError)) throw new ClueReadError('not_clue');
      if (e.code === 'password_required') return { kind: 'needs_password' };
      if (e.code === 'wrong_password') throw new ClueReadError('wrong_password');
      if (e.code === 'too_large') throw new ClueReadError('too_large');
      throw new ClueReadError('not_clue');
    }
  }
  let parsed;
  try {
    parsed = parseClueMeasurements(strFromU8(json));
  } catch (e) {
    throw new ClueReadError(e instanceof ClueFormatError && e.message === 'too_many' ? 'too_large' : 'not_clue');
  }
  let data: ClueImport;
  try {
    data = mapClue(parsed.records);
  } catch (e) {
    // Só os limites lançam aqui (ex.: tags demais); outro erro é bug e sobe.
    if (e instanceof ClueFormatError) throw new ClueReadError('too_large');
    throw e;
  }
  if (data.days === 0 && Object.keys(data.unknown).length === 0) throw new ClueReadError('empty');
  return { kind: 'ready', data, invalid: parsed.invalid };
}
