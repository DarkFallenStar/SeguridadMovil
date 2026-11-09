/**
 * Módulo Criptográfico PKCE (RFC 7636)
 * Genera code_verifier, code_challenge (SHA-256 Base64URL unpadded) y state anti-CSRF.
 */

import * as Crypto from 'expo-crypto';

// Caracteres permitidos por el RFC 7636 (Sección 4.1):
// A-Z, a-z, 0-9, "-", ".", "_", "~"
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/**
 * Convierte un string Base64 estándar a Base64URL sin relleno (unpadded)
 * según el RFC 7636 y RFC 4648.
 * Reemplaza '+' por '-', '/' por '_' y elimina '='.
 */
export function toBase64UrlUnpadded(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Genera un code_verifier criptográficamente seguro de alta entropía.
 * @param length Longitud de la cadena (por defecto 64, RFC exige entre 43 y 128).
 */
export function generateCodeVerifier(length: number = 64): string {
  if (length < 43 || length > 128) {
    throw new Error('RFC 7636 exige que code_verifier tenga entre 43 y 128 caracteres.');
  }

  const randomBytes = Crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomBytes[i] % CHARSET.length];
  }
  return result;
}

/**
 * Genera el code_challenge a partir del code_verifier:
 * code_challenge = Base64Url(SHA256(code_verifier)) sin padding.
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const base64Hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );

  return toBase64UrlUnpadded(base64Hash);
}

/**
 * Genera un parámetro `state` aleatorio de alta entropía para protección Anti-CSRF.
 * @param length Longitud del state (32 caracteres).
 */
export function generateRandomState(length: number = 32): string {
  const randomBytes = Crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomBytes[i] % CHARSET.length];
  }
  return result;
}

