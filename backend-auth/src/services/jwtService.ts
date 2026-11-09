/**
 * Servicio Criptográfico de Emisión y Verificación de Tokens JWT (RFC 7519)
 * Implementado con node:crypto sin librerías externas para máxima transparencia y control.
 */

import crypto from 'node:crypto';
import { TokenPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'unisabana_super_secret_jwt_hmac_sha256_key_2026';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Firma un payload y genera un JWT firmado con HMAC-SHA256.
 * @param payload Datos del token
 * @param expiresInSeconds Vida útil en segundos
 */
export function signJwt(payload: TokenPayload, expiresInSeconds: number): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifica la firma criptográfica y la vigencia temporal de un JWT.
 * @param token Token JWT
 */
export function verifyJwt<T extends TokenPayload = TokenPayload>(token: string): { valid: boolean; payload?: T; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Formato de JWT inválido' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verificar firma con HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    // Comparación en tiempo constante para mitigar timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Firma de token inválida' };
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as T;

    // Verificar expiración temporal
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expirado', payload };
    }

    return { valid: true, payload };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al verificar token';
    return { valid: false, error: message };
  }
}

