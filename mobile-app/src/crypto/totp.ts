/**
 * Motor Matemático TOTP desde Cero (RFC 6238, RFC 4226, RFC 2104 y RFC 3174)
 * Cero librerías externas: implementa SHA-1, HMAC-SHA1, empaquetado Big-Endian de 64 bits
 * y Truncamiento Dinámico en TypeScript puro para funcionamiento 100% offline (Modo Avión).
 */

import { base32ToBytes } from './base32';

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/**
 * Primitiva criptográfica SHA-1 (RFC 3174) sobre Uint8Array.
 * Produce un digest de exactamente 20 bytes (160 bits).
 */
export function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length;
  const bitLength = ml * 8;

  // Padding: mensaje + 1 byte (0x80) + ceros + 8 bytes de longitud (múltiplo de 64 bytes)
  const totalLength = Math.ceil((ml + 9) / 64) * 64;
  const padded = new Uint8Array(totalLength);
  padded.set(message);
  padded[ml] = 0x80;

  const paddedView = new DataView(padded.buffer);
  paddedView.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);
  paddedView.setUint32(totalLength - 4, bitLength >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = paddedView.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i++) {
      const n = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = ((n << 1) | (n >>> 31)) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f = 0;
      let k = 0;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = ((((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0);
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const digestView = new DataView(digest.buffer);
  digestView.setUint32(0, h0, false);
  digestView.setUint32(4, h1, false);
  digestView.setUint32(8, h2, false);
  digestView.setUint32(12, h3, false);
  digestView.setUint32(16, h4, false);
  return digest;
}

/**
 * Primitiva HMAC-SHA1 (RFC 2104):
 * HMAC(K, m) = SHA1((K' xor opad) || SHA1((K' xor ipad) || m))
 */
export function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  const normalizedKey = key.length > blockSize ? sha1(key) : key;

  const keyBlock = new Uint8Array(blockSize);
  keyBlock.set(normalizedKey);

  const ipad = new Uint8Array(blockSize + message.length);
  const opad = new Uint8Array(blockSize + 20);

  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyBlock[i] ^ 0x36;
    opad[i] = keyBlock[i] ^ 0x5c;
  }

  ipad.set(message, blockSize);
  const innerHash = sha1(ipad);

  opad.set(innerHash, blockSize);
  return sha1(opad);
}

/**
 * Empaqueta el contador de tiempo T = floor(unixSeconds / step)
 * en un arreglo binario de 8 bytes (64 bits) en orden Big-Endian (RFC 4226 §5.2).
 */
export function timeCounterToBuffer(
  timestampSeconds: number,
  stepSeconds: number = TOTP_STEP_SECONDS
): Uint8Array {
  const counter = Math.floor(timestampSeconds / stepSeconds);
  const high32 = Math.floor(counter / 0x100000000);
  const low32 = counter >>> 0;

  const buffer = new Uint8Array(8);
  const view = new DataView(buffer.buffer);
  view.setUint32(0, high32, false);
  view.setUint32(4, low32, false);
  return buffer;
}

/**
 * Aplica el Truncamiento Dinámico (Dynamic Truncation) de RFC 4226 §5.3 sobre el digest HMAC-SHA1 de 20 bytes.
 */
export function dynamicTruncation(hmacDigest: Uint8Array, digits: number = TOTP_DIGITS): string {
  const offset = hmacDigest[19] & 0x0f;

  const binCode =
    (((hmacDigest[offset] & 0x7f) << 24) |
      ((hmacDigest[offset + 1] & 0xff) << 16) |
      ((hmacDigest[offset + 2] & 0xff) << 8) |
      (hmacDigest[offset + 3] & 0xff)) >>>
    0;

  const modulo = Math.pow(10, digits);
  return (binCode % modulo).toString().padStart(digits, '0');
}

/**
 * Genera el código TOTP de 6 dígitos a partir de una semilla Base32 (o URI otpauth://)
 * y un timestamp en milisegundos. Ejecución 100% local y sincrónica (soporta Modo Avión).
 */
export function generateTOTP(
  secretBase32OrUri: string,
  timestampMs: number = Date.now(),
  stepSeconds: number = TOTP_STEP_SECONDS
): string {
  const secretBytes = base32ToBytes(secretBase32OrUri);
  const timestampSeconds = Math.floor(timestampMs / 1000);
  const timeBuffer = timeCounterToBuffer(timestampSeconds, stepSeconds);
  const hmacDigest = hmacSha1(secretBytes, timeBuffer);

  return dynamicTruncation(hmacDigest, TOTP_DIGITS);
}

/**
 * Calcula los metadatos temporales de la ventana TOTP actual para la interfaz reactiva.
 */
export function getTotpWindowInfo(
  timestampMs: number = Date.now(),
  stepSeconds: number = TOTP_STEP_SECONDS
) {
  const nowSeconds = Math.floor(timestampMs / 1000);
  const timeCounter = Math.floor(nowSeconds / stepSeconds);
  const secondsRemaining = stepSeconds - (nowSeconds % stepSeconds);

  return {
    timeCounter,
    secondsRemaining,
    progressRatio: secondsRemaining / stepSeconds,
  };
}
