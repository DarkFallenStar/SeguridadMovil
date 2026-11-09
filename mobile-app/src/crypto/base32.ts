/**
 * Decodificador Base32 Puro (RFC 4648) y Extractor de URI otpauth://
 * Convierte cadenas Base32 (bloques de 5 bits) en arreglos binarios de 8 bits (Uint8Array).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Si el usuario ingresa o escanea una URI completa formato Google Authenticator:
 * otpauth://totp/UniSabana:estudiante@unisabana.edu.co?secret=JBSWY3DPEHPK3PXP&issuer=UniSabana
 * extrae limpiamente el valor del parámetro `secret` (y opcionalmente el `issuer`/`label`).
 */
export function parseTotpInput(input: string): { secret: string; label?: string } {
  const trimmed = input.trim();

  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    const secretMatch = trimmed.match(/[?&]secret=([^&#]+)/i);
    const labelMatch = trimmed.match(/^otpauth:\/\/totp\/([^?]+)/i);
    return {
      secret: secretMatch ? decodeURIComponent(secretMatch[1]).toUpperCase() : '',
      label: labelMatch ? decodeURIComponent(labelMatch[1]) : undefined,
    };
  }

  return { secret: trimmed.toUpperCase() };
}

/**
 * Decodifica una semilla Base32 en sus bytes crudos (Uint8Array) conforme al RFC 4648.
 * Cada carácter Base32 aporta 5 bits; cada 8 bits acumulados emiten 1 byte.
 */
export function base32ToBytes(rawInput: string): Uint8Array {
  const { secret } = parseTotpInput(rawInput);

  // Limpiar espacios, guiones y relleno '='
  const cleaned = secret.replace(/[\s\-=]+/g, '').toUpperCase();

  if (!cleaned) {
    throw new Error('La semilla Base32 está vacía.');
  }

  const outputLength = Math.floor((cleaned.length * 5) / 8);
  const bytes = new Uint8Array(outputLength);

  let bitsBuffer = 0;
  let bitsCount = 0;
  let byteIndex = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const charValue = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (charValue === -1) {
      throw new Error(`Carácter inválido '${cleaned[i]}' en semilla Base32 (permitidos: A-Z y 2-7).`);
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

