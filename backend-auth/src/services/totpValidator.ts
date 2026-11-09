/**
 * Validador Criptográfico TOTP en Backend (RFC 6238 y RFC 4226)
 * Implementado desde cero con node:crypto (HMAC-SHA1 + Dynamic Truncation) sin librerías de alto nivel.
 * Soporta tolerancia a desfase de reloj (Clock Skew) en las ventanas C-1, C y C+1.
 */

import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const DEFAULT_TOTP_SECRET_BASE32 =
  process.env.TOTP_SECRET_BASE32 || 'JBSWY3DPEHPK3PXP';
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/**
 * Decodifica una cadena Base32 (RFC 4648) a Buffer de bytes.
 */
export function base32ToBuffer(rawInput: string): Buffer {
  const cleaned = rawInput.replace(/[\s\-=]+/g, '').toUpperCase();
  if (!cleaned) {
    throw new Error('Semilla Base32 vacía.');
  }

  const outputLength = Math.floor((cleaned.length * 5) / 8);
  const bytes = Buffer.alloc(outputLength);

  let bitsBuffer = 0;
  let bitsCount = 0;
  let byteIndex = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const charValue = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (charValue === -1) {
      throw new Error(`Carácter Base32 inválido: '${cleaned[i]}'`);
    }

    bitsBuffer = (bitsBuffer << 5) | charValue;
    bitsCount += 5;

    if (bitsCount >= 8) {
      bitsCount -= 8;
      bytes[byteIndex++] = (bitsBuffer >>> bitsCount) & 0xff;
    }
  }

  return bytes;
}

/**
 * Empaqueta un contador entero T en un Buffer de 8 bytes (64 bits) en orden Big-Endian.
 */
export function counterToBuffer(counter: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  return buf;
}

/**
 * Genera un código HOTP/TOTP para un contador T específico y una clave secreta en bytes.
 */
export function generateHOTPFromBytes(
  secretBytes: Buffer,
  counter: number | bigint,
  digits: number = TOTP_DIGITS
): string {
  const timeBuffer = counterToBuffer(counter);
  const hmacDigest = crypto.createHmac('sha1', secretBytes).update(timeBuffer).digest();

  // Dynamic Truncation (RFC 4226 §5.3)
  const offset = hmacDigest[hmacDigest.length - 1] & 0x0f;
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
 * Genera el código TOTP de 6 dígitos para una semilla Base32 en un instante dado (ms).
 */
export function generateTOTP(
  secretBase32: string = DEFAULT_TOTP_SECRET_BASE32,
  timestampMs: number = Date.now(),
  stepSeconds: number = TOTP_STEP_SECONDS
): string {
  const secretBytes = base32ToBuffer(secretBase32);
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  return generateHOTPFromBytes(secretBytes, counter, TOTP_DIGITS);
}

/**
 * Valida un código TOTP considerando tolerancia a desfase de reloj (Clock Skew)
 * en las tres ventanas permitidas por la guía: C-1 (t - 30s), C (t) y C+1 (t + 30s).
 */
export function verifyTOTPWithClockSkew(
  inputCode: string,
  secretBase32: string = DEFAULT_TOTP_SECRET_BASE32,
  timestampMs: number = Date.now(),
  stepSeconds: number = TOTP_STEP_SECONDS
): { valid: boolean; matchedCounter?: number; windowOffset?: number } {
  const normalizedCode = inputCode.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return { valid: false };
  }

  const secretBytes = base32ToBuffer(secretBase32);
  const currentCounter = Math.floor(timestampMs / 1000 / stepSeconds);

  for (const offset of [0, -1, 1]) {
    const candidateCounter = currentCounter + offset;
    const expectedCode = generateHOTPFromBytes(secretBytes, candidateCounter, TOTP_DIGITS);

    if (
      crypto.timingSafeEqual(
        Buffer.from(normalizedCode, 'ascii'),
        Buffer.from(expectedCode, 'ascii')
      )
    ) {
      return {
        valid: true,
        matchedCounter: candidateCounter,
        windowOffset: offset,
      };
    }
  }

  return { valid: false };
}

