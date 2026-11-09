/**
 * Validador Criptográfico y Gestor de Aprovisionamiento TOTP en Backend (RFC 6238 y RFC 4226)
 * Implementado desde cero con node:crypto (HMAC-SHA1 + Dynamic Truncation) sin librerías de alto nivel.
 * Soporta tolerancia a desfase de reloj (Clock Skew) en las ventanas C-1, C y C+1.
 */

import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const DEFAULT_TOTP_SECRET_BASE32 =
  process.env.TOTP_SECRET_BASE32 || 'JBSWY3DPEHPK3PXP';
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

// Almacén en memoria (Decisión 1A) de secretos TOTP por usuario
const userTotpSecretsStore = new Map<string, string>();

export interface ParsedTotpConfig {
  secret: string;
  label: string;
  issuer: string;
  algorithm: 'SHA1';
  digits: 6;
  period: 30;
  otpauthUri: string;
}

/**
 * Construye la URI estándar otpauth://totp/ según el formato de Google Authenticator y la guía del taller.
 */
export function buildOtpAuthUri(
  secret: string = DEFAULT_TOTP_SECRET_BASE32,
  accountEmail: string = 'estudiante@unisabana.edu.co',
  issuer: string = 'UniSabana'
): string {
  const cleanSecret = secret.replace(/[\s\-=]+/g, '').toUpperCase();
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Valida estrictamente una semilla Base32 o una URI otpauth://totp/ completa.
 * Rechaza parámetros incompatibles (hotp, SHA256/512, dígitos != 6 o periodo != 30).
 */
export function parseTotpInput(
  input: string,
  defaultLabel: string = 'UniSabana:estudiante@unisabana.edu.co',
  defaultIssuer: string = 'UniSabana'
): ParsedTotpConfig {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('La semilla Base32 o URI otpauth:// está vacía.');
  }

  let rawSecret = trimmed;
  let label = defaultLabel;
  let issuer = defaultIssuer;

  if (trimmed.includes('://')) {
    if (!trimmed.toLowerCase().startsWith('otpauth://')) {
      throw new Error('Esquema URI inválido: se requiere otpauth://.');
    }

    const withoutScheme = trimmed.slice('otpauth://'.length);
    const slashIndex = withoutScheme.indexOf('/');
    const queryIndex = withoutScheme.indexOf('?');

    const type = (slashIndex !== -1 ? withoutScheme.slice(0, slashIndex) : withoutScheme).toLowerCase();
    if (type !== 'totp') {
      throw new Error(`Tipo OTP '${type}' no soportado. Se requiere 'totp'.`);
    }

    if (slashIndex !== -1) {
      const rawLabel =
        queryIndex !== -1
          ? withoutScheme.slice(slashIndex + 1, queryIndex)
          : withoutScheme.slice(slashIndex + 1);
      if (rawLabel) {
        label = decodeURIComponent(rawLabel);
      }
    }

    const queryString = queryIndex !== -1 ? withoutScheme.slice(queryIndex + 1) : '';
    const params = new URLSearchParams(queryString);

    const secretParam = params.get('secret');
    if (!secretParam) {
      throw new Error('La URI otpauth:// no contiene el parámetro "secret".');
    }
    rawSecret = secretParam;

    const issuerParam = params.get('issuer');
    if (issuerParam) {
      issuer = issuerParam;
    }

    const algorithmParam = params.get('algorithm');
    if (algorithmParam && algorithmParam.toUpperCase() !== 'SHA1') {
      throw new Error(`Algoritmo '${algorithmParam}' incompatible. Se requiere SHA1.`);
    }

    const digitsParam = params.get('digits');
    if (digitsParam && Number(digitsParam) !== 6) {
      throw new Error(`Número de dígitos '${digitsParam}' incompatible. Se requieren 6 dígitos.`);
    }

    const periodParam = params.get('period');
    if (periodParam && Number(periodParam) !== 30) {
      throw new Error(`Periodo '${periodParam}s' incompatible. Se requieren 30 segundos.`);
    }
  }

  const cleanedSecret = rawSecret.replace(/[\s\-=]+/g, '').toUpperCase();
  if (cleanedSecret.length < 8) {
    throw new Error('La semilla Base32 debe tener al menos 8 caracteres.');
  }

  for (let i = 0; i < cleanedSecret.length; i++) {
    if (BASE32_ALPHABET.indexOf(cleanedSecret[i]) === -1) {
      throw new Error(`Carácter Base32 inválido: '${cleanedSecret[i]}'`);
    }
  }

  const accountPart = label.includes(':') ? label.split(':')[1] : label;

  return {
    secret: cleanedSecret,
    label,
    issuer,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    otpauthUri: buildOtpAuthUri(cleanedSecret, accountPart, issuer),
  };
}

/**
 * Obtiene la semilla Base32 activa del usuario (por defecto JBSWY3DPEHPK3PXP).
 */
export function getUserTotpSecret(userId: string = 'user_unisabana_01'): string {
  return userTotpSecretsStore.get(userId) || DEFAULT_TOTP_SECRET_BASE32;
}

/**
 * Registra o actualiza la semilla Base32 activa del usuario tras validarla.
 */
export function setUserTotpSecret(
  userId: string,
  secretOrUri: string
): ParsedTotpConfig {
  const parsed = parseTotpInput(secretOrUri);
  userTotpSecretsStore.set(userId, parsed.secret);
  return parsed;
}

/**
 * Decodifica una cadena Base32 (RFC 4648) a Buffer de bytes.
 */
export function base32ToBuffer(rawInput: string): Buffer {
  const { secret } = parseTotpInput(rawInput);

  const outputLength = Math.floor((secret.length * 5) / 8);
  const bytes = Buffer.alloc(outputLength);

  let bitsBuffer = 0;
  let bitsCount = 0;
  let byteIndex = 0;

  for (let i = 0; i < secret.length; i++) {
    const charValue = BASE32_ALPHABET.indexOf(secret[i]);
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
