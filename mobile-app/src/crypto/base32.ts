/**
 * Decodificador Base32 Puro (RFC 4648) y Validador Estricto de URI otpauth://totp/
 * Cumple con los requisitos de la Fase 5 (Ingesta y Validación del Secreto TOTP).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface ParsedTotpConfig {
  secret: string;
  label: string;
  issuer: string;
  algorithm: 'SHA1';
  digits: 6;
  period: 30;
}

/**
 * Interpreta y valida estrictamente una semilla Base32 directa o una URI otpauth://totp/.
 * No acepta silenciosamente configuraciones incompatibles con el estándar del taller (RFC 6238).
 */
export function parseTotpInput(
  input: string,
  defaultLabel: string = 'UniSabana:estudiante@unisabana.edu.co',
  defaultIssuer: string = 'UniSabana'
): ParsedTotpConfig {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('La semilla o URI TOTP no puede estar vacía.');
  }

  let rawSecret = trimmed;
  let label = defaultLabel;
  let issuer = defaultIssuer;

  if (trimmed.includes('://')) {
    if (!trimmed.toLowerCase().startsWith('otpauth://')) {
      throw new Error('Esquema URI inválido: se requiere el protocolo otpauth://.');
    }

    const withoutScheme = trimmed.slice('otpauth://'.length);
    const slashIndex = withoutScheme.indexOf('/');
    const queryIndex = withoutScheme.indexOf('?');

    const type = (slashIndex !== -1 ? withoutScheme.slice(0, slashIndex) : withoutScheme).toLowerCase();
    if (type !== 'totp') {
      throw new Error(`Tipo OTP no soportado ('${type}'). Solo se admite 'totp' (basado en tiempo).`);
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
      throw new Error('La URI otpauth:// no contiene el parámetro obligatorio "secret".');
    }
    rawSecret = secretParam;

    const issuerParam = params.get('issuer');
    if (issuerParam) {
      issuer = issuerParam;
    }

    const algorithmParam = params.get('algorithm');
    if (algorithmParam && algorithmParam.toUpperCase() !== 'SHA1') {
      throw new Error(`Algoritmo '${algorithmParam}' incompatible. El taller exige HMAC-SHA1.`);
    }

    const digitsParam = params.get('digits');
    if (digitsParam && Number(digitsParam) !== 6) {
      throw new Error(`Longitud de dígitos '${digitsParam}' incompatible. Se requieren exactamente 6 dígitos.`);
    }

    const periodParam = params.get('period');
    if (periodParam && Number(periodParam) !== 30) {
      throw new Error(`Periodo '${periodParam}s' incompatible. La ventana temporal debe ser de 30 segundos.`);
    }
  }

  const cleanedSecret = rawSecret.replace(/[\s\-=]+/g, '').toUpperCase();
  if (cleanedSecret.length < 8) {
    throw new Error('La semilla Base32 es demasiado corta (mínimo 8 caracteres).');
  }

  for (let i = 0; i < cleanedSecret.length; i++) {
    if (BASE32_ALPHABET.indexOf(cleanedSecret[i]) === -1) {
      throw new Error(
        `Carácter inválido '${cleanedSecret[i]}' en semilla Base32 (solo se permiten A-Z y 2-7).`
      );
    }
  }

  return {
    secret: cleanedSecret,
    label,
    issuer,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  };
}

/**
 * Decodifica una semilla Base32 (o URI otpauth://totp/) en bytes (Uint8Array) conforme al RFC 4648.
 */
export function base32ToBytes(rawInput: string): Uint8Array {
  const { secret } = parseTotpInput(rawInput);

  const outputLength = Math.floor((secret.length * 5) / 8);
  const bytes = new Uint8Array(outputLength);

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
