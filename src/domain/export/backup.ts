import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';

/** O KDF em JS é leve (ver DEFAULT_KDF): a proteção contra força bruta vem da senha longa. */
export const MIN_PASSWORD = 12;
/** Mensagem única para senha errada e arquivo danificado: não dá pista a quem tenta adivinhar. */
export const BACKUP_ERROR = 'Senha incorreta ou arquivo danificado.';

export type KdfParams = { N: number; r: number; p: number };
/**
 * Padrão do app: 2^15 com scrypt nativo (OpenSSL), que no S21 FE leva menos de 1 s. Os parâmetros vão no
 * arquivo: backups antigos (2^13, feitos com scrypt em JS) continuam abrindo.
 */
export const DEFAULT_KDF: KdfParams = { N: 2 ** 15, r: 8, p: 1 };
// Limites ao abrir: um arquivo forjado com N enorme deixaria o app calculando por muito tempo.
const N_RANGE = { min: 2 ** 10, max: 2 ** 16 } as const;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

type Envelope = {
  format: 'ciclo-livre-backup';
  version: 1;
  kdf: { name: 'scrypt'; salt: string } & KdfParams;
  cipher: { name: 'aes-256-gcm'; nonce: string };
  data: string;
};

/** Implementação do scrypt (RFC 7914): a do JS por padrão; o app injeta a nativa, que dá o mesmo resultado. */
export type Scrypt = (password: Uint8Array, salt: Uint8Array, params: KdfParams & { dkLen: number }) => Promise<Uint8Array>;
export const defaultScrypt: Scrypt = (password, salt, params) => scryptAsync(password, salt, params);

type Options = { random: (bytes: number) => Uint8Array; kdf?: KdfParams; scrypt?: Scrypt };

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

const deriveKey = (password: string, salt: Uint8Array, { N, r, p }: KdfParams, scrypt: Scrypt) =>
  scrypt(utf8ToBytes(password), salt, { N, r, p, dkLen: KEY_BYTES });

/** Criptografa o JSON exportado com uma chave derivada da senha (scrypt + AES-256-GCM). */
export async function encryptBackup(
  plain: string,
  password: string,
  { random, kdf = DEFAULT_KDF, scrypt = defaultScrypt }: Options,
): Promise<string> {
  if (password.length < MIN_PASSWORD) throw new Error('Senha curta.');
  const salt = random(SALT_BYTES);
  const nonce = random(NONCE_BYTES);
  const key = await deriveKey(password, salt, kdf, scrypt);
  const data = gcm(key, nonce).encrypt(utf8ToBytes(plain));
  const envelope: Envelope = {
    format: 'ciclo-livre-backup',
    version: 1,
    kdf: { name: 'scrypt', ...kdf, salt: toBase64(salt) },
    cipher: { name: 'aes-256-gcm', nonce: toBase64(nonce) },
    data: toBase64(data),
  };
  return JSON.stringify(envelope);
}

function readEnvelope(file: string): Envelope {
  const e = JSON.parse(file) as Envelope;
  const { kdf, cipher } = e;
  const powerOfTwo = Number.isInteger(Math.log2(kdf?.N));
  if (
    e.format !== 'ciclo-livre-backup' ||
    e.version !== 1 ||
    kdf?.name !== 'scrypt' ||
    cipher?.name !== 'aes-256-gcm' ||
    !powerOfTwo ||
    kdf.N < N_RANGE.min ||
    kdf.N > N_RANGE.max ||
    kdf.r !== 8 ||
    kdf.p !== 1 ||
    typeof kdf.salt !== 'string' ||
    typeof cipher.nonce !== 'string' ||
    typeof e.data !== 'string'
  ) {
    throw new Error('envelope');
  }
  return e;
}

/** Abre o backup. Qualquer falha (senha, adulteração, formato) vira o mesmo erro genérico. */
export async function decryptBackup(file: string, password: string, { scrypt = defaultScrypt }: { scrypt?: Scrypt } = {}): Promise<string> {
  try {
    const e = readEnvelope(file);
    const salt = fromBase64(e.kdf.salt);
    const nonce = fromBase64(e.cipher.nonce);
    if (salt.length !== SALT_BYTES || nonce.length !== NONCE_BYTES) throw new Error('envelope');
    const key = await deriveKey(password, salt, e.kdf, scrypt);
    return bytesToUtf8(gcm(key, nonce).decrypt(fromBase64(e.data)));
  } catch {
    // Detalhe do erro omitido de propósito (ver BACKUP_ERROR).
    throw new Error(BACKUP_ERROR);
  }
}

export type PasswordStrength = 'short' | 'good' | 'great';

/** Força estimada pelo tamanho e pela variedade de caracteres. Abaixo do mínimo, o backup não é criado. */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < MIN_PASSWORD) return 'short';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  return password.length >= 16 || kinds >= 3 ? 'great' : 'good';
}

/** 32 símbolos sem os que se confundem ao anotar (0/O, 1/I): 5 bits por caractere, sem viés (256 % 32 = 0). */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Senha aleatória de 20 caracteres (100 bits) em 4 grupos, fácil de anotar. */
export function generateBackupPassword(random: (bytes: number) => Uint8Array): string {
  const chars = Array.from(random(20), (b) => ALPHABET[b % ALPHABET.length]);
  return [0, 5, 10, 15].map((i) => chars.slice(i, i + 5).join('')).join('-');
}
