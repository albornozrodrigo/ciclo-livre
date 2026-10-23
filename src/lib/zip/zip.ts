import { ecb } from '@noble/ciphers/aes.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { inflateSync, strToU8 } from 'fflate';

/**
 * Leitor mínimo de ZIP em JS puro (sem worker nem API nativa): lê UMA entrada, em memória,
 * com senha ZipCrypto ou AES (WinZip AE-1/AE-2). Nada é gravado em disco.
 */
export type ZipErrorCode = 'not_zip' | 'not_found' | 'password_required' | 'wrong_password' | 'too_large' | 'unsupported' | 'corrupt';

export class ZipError extends Error {
  constructor(readonly code: ZipErrorCode) {
    super(code);
  }
}

const fail = (code: ZipErrorCode): never => {
  throw new ZipError(code);
};

const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Entry = {
  name: string;
  flags: number;
  method: number;
  crc: number;
  compSize: number;
  size: number;
  offset: number;
  aes: { strength: number; method: number; version: number } | null;
};

function centralDirectory(zip: Uint8Array): Entry[] {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (u32(zip, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) fail('not_zip');
  const count = u16(zip, eocd + 10);
  let at = u32(zip, eocd + 16);
  if (count === 0xffff || at === 0xffffffff) fail('unsupported'); // ZIP64: não esperado em < 50 MB
  const entries: Entry[] = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > zip.length || u32(zip, at) !== 0x02014b50) fail('corrupt');
    const nameLen = u16(zip, at + 28);
    const extraLen = u16(zip, at + 30);
    const commentLen = u16(zip, at + 32);
    const nameBytes = zip.subarray(at + 46, at + 46 + nameLen);
    const name = Array.from(nameBytes, (c) => String.fromCharCode(c)).join('');
    let aes: Entry['aes'] = null;
    for (let e = at + 46 + nameLen; e + 4 <= at + 46 + nameLen + extraLen;) {
      const id = u16(zip, e);
      const len = u16(zip, e + 2);
      if (id === 0x9901 && len >= 7) aes = { version: u16(zip, e + 4), strength: zip[e + 8], method: u16(zip, e + 9) };
      e += 4 + len;
    }
    entries.push({
      name,
      flags: u16(zip, at + 8),
      method: u16(zip, at + 10),
      crc: u32(zip, at + 16),
      compSize: u32(zip, at + 20),
      size: u32(zip, at + 24),
      offset: u32(zip, at + 42),
      aes,
    });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function zipCryptoDecrypt(data: Uint8Array, password: Uint8Array, check: number): Uint8Array {
  let k0 = 0x12345678;
  let k1 = 0x23456789;
  let k2 = 0x34567890;
  const update = (c: number) => {
    k0 = CRC_TABLE[(k0 ^ c) & 0xff] ^ (k0 >>> 8);
    k1 = (Math.imul((k1 + (k0 & 0xff)) >>> 0, 134775813) + 1) >>> 0;
    k2 = CRC_TABLE[(k2 ^ (k1 >>> 24)) & 0xff] ^ (k2 >>> 8);
  };
  for (const c of password) update(c);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const t = (k2 | 2) & 0xffff;
    const c = data[i] ^ ((Math.imul(t, t ^ 1) >>> 8) & 0xff);
    out[i] = c;
    update(c);
  }
  if (data.length < 12 || out[11] !== check) fail('wrong_password');
  return out.subarray(12);
}

function aesDecrypt(data: Uint8Array, password: Uint8Array, strength: number): Uint8Array {
  const keyLen = [0, 16, 24, 32][strength];
  if (!keyLen) fail('unsupported');
  const saltLen = keyLen / 2;
  if (data.length < saltLen + 2 + 10) fail('corrupt');
  const salt = data.subarray(0, saltLen);
  const derived = pbkdf2(sha1, password, salt, { c: 1000, dkLen: keyLen * 2 + 2 });
  const verifier = data.subarray(saltLen, saltLen + 2);
  if (derived[keyLen * 2] !== verifier[0] || derived[keyLen * 2 + 1] !== verifier[1]) fail('wrong_password');
  const body = data.subarray(saltLen + 2, data.length - 10);
  const mac = hmac(sha1, derived.subarray(keyLen, keyLen * 2), body).subarray(0, 10);
  const stored = data.subarray(data.length - 10);
  let diff = 0;
  for (let i = 0; i < 10; i++) diff |= mac[i] ^ stored[i];
  if (diff !== 0) fail('corrupt');

  // CTR do WinZip: contador little-endian começando em 1 (o ctr do noble é big-endian).
  const cipher = ecb(derived.subarray(0, keyLen), { disablePadding: true });
  const out = new Uint8Array(body.length);
  const CHUNK = 4096; // blocos por rodada
  for (let block = 0; block * 16 < body.length; block += CHUNK) {
    const blocks = Math.min(CHUNK, Math.ceil((body.length - block * 16) / 16));
    const counters = new Uint8Array(blocks * 16);
    for (let j = 0; j < blocks; j++) {
      let n = block + j + 1;
      for (let b = 0; b < 8 && n > 0; b++) {
        counters[j * 16 + b] = n & 0xff;
        n = Math.floor(n / 256);
      }
    }
    const stream = cipher.encrypt(counters);
    const base = block * 16;
    const end = Math.min(body.length, base + blocks * 16);
    for (let i = base; i < end; i++) out[i] = body[i] ^ stream[i - base];
  }
  return out;
}

/** Lê a primeira entrada cujo nome passa em `match`. Limita o tamanho descompactado a `maxBytes`. */
export function readZipEntry(zip: Uint8Array, match: (name: string) => boolean, opts: { password?: string; maxBytes: number }): Uint8Array {
  const entry = centralDirectory(zip).find((e) => !e.name.endsWith('/') && match(e.name));
  if (!entry) return fail('not_found');
  if (entry.size > opts.maxBytes || entry.compSize > opts.maxBytes) fail('too_large');

  const at = entry.offset;
  if (at + 30 > zip.length || u32(zip, at) !== 0x04034b50) fail('corrupt');
  const start = at + 30 + u16(zip, at + 26) + u16(zip, at + 28);
  if (start + entry.compSize > zip.length) fail('corrupt');
  let data = zip.subarray(start, start + entry.compSize);

  let method = entry.method;
  let checkCrc = true;
  if (entry.flags & 1) {
    if (!opts.password) fail('password_required');
    const password = strToU8(opts.password ?? '');
    if (method === 99) {
      if (!entry.aes) fail('corrupt');
      const aes = entry.aes as NonNullable<Entry['aes']>;
      data = aesDecrypt(data, password, aes.strength);
      method = aes.method;
      checkCrc = aes.version === 1; // AE-2 zera o CRC; a integridade vem do HMAC
    } else {
      const check = entry.flags & 8 ? (u16(zip, at + 10) >> 8) & 0xff : entry.crc >>> 24;
      data = zipCryptoDecrypt(data, password, check);
    }
  }

  let out: Uint8Array;
  if (method === 0) out = data;
  else if (method === 8) {
    try {
      out = inflateSync(data, { out: new Uint8Array(entry.size) });
    } catch {
      return fail('corrupt');
    }
  } else return fail('unsupported');

  if (out.length !== entry.size) fail('corrupt');
  if (checkCrc && crc32(out) !== entry.crc) fail('corrupt');
  return out;
}
