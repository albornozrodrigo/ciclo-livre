import { scrypt } from 'react-native-quick-crypto';

import type { Scrypt } from '@/domain/export/backup';

/**
 * scrypt nativo (OpenSSL via react-native-quick-crypto): mesmo resultado do JS (RFC 7914), muito mais rápido.
 * `maxmem` cobre o que o N pede (128 · r · N bytes) com folga; o OpenSSL recusa acima disso.
 */
export const nativeScrypt: Scrypt = (password, salt, { N, r, p, dkLen }) =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, dkLen, { N, r, p, maxmem: 256 * r * N }, (error, key) => {
      if (error || !key) reject(error ?? new Error('scrypt'));
      else resolve(new Uint8Array(key.buffer, key.byteOffset, key.byteLength));
    });
  });
