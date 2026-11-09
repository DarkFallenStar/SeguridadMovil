/**
 * Servicio OAuth 2.0 con PKCE (RFC 7636 y RFC 6749)
 * Gestiona authorization_codes, verificación matemática de code_challenge y emisión de tokens.
 */

import crypto from 'node:crypto';
import { signJwt } from './jwtService.js';

export interface AuthCodeData {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state: string;
  userId: string;
  email: string;
  approved: boolean;
  expiresAt: number; // Unix ms
}

export interface RefreshTokenRecord {
  refreshToken: string;
  userId: string;
  email: string;
  clientId: string;
  expiresAt: number;
  revoked: boolean;
}

// Almacenes en memoria para authorization codes y refresh tokens
const authCodesStore = new Map<string, AuthCodeData>();
const authCodesByStateStore = new Map<string, AuthCodeData>();
export const refreshTokensStore = new Map<string, RefreshTokenRecord>();

// Usuario de prueba predeterminado según la guía del taller
export const DEFAULT_USER = {
  id: 'user_unisabana_01',
  email: 'estudiante@unisabana.edu.co',
  name: 'Estudiante UniSabana',
};

/**
 * Registra y emite un authorization_code tras el consentimiento del usuario.
 */
export function createAuthorizationCode(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state: string;
  approved?: boolean;
}): string {
  const code = 'auth_code_' + crypto.randomBytes(24).toString('base64url');

  const authCodeData: AuthCodeData = {
    code,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    state: params.state,
    userId: DEFAULT_USER.id,
    email: DEFAULT_USER.email,
    approved: params.approved ?? false,
    expiresAt: Date.now() + 180 * 1000, // Código válido por 3 minutos
  };

  authCodesStore.set(code, authCodeData);
  authCodesByStateStore.set(params.state, authCodeData);
  return code;
}

/**
 * Marca un authorization_code como explícitamente aprobado por el usuario en el navegador del sistema.
 */
export function approveAuthorizationCode(code: string, state: string): AuthCodeData | null {
  const record = authCodesStore.get(code);
  if (!record || record.state !== state || Date.now() > record.expiresAt) {
    return null;
  }
  record.approved = true;
  return record;
}

/**
 * Consulta si la sesión asociada a un parámetro `state` ya fue autorizada por el usuario en el navegador.
 * Esto permite recuperar el callback incluso cuando fabricantes Android (como Vivo/Xiaomi) o Firefox
 * bloquean el intent de retorno hacia el contenedor Expo Go.
 */
export function getApprovedAuthCodeByState(state: string): AuthCodeData | null {
  const record = authCodesByStateStore.get(state);
  if (!record) {
    return null;
  }
  if (Date.now() > record.expiresAt) {
    authCodesByStateStore.delete(state);
    authCodesStore.delete(record.code);
    return null;
  }
  return record.approved ? record : null;
}

/**
 * Valida el code_verifier contra el code_challenge mediante SHA-256 (RFC 7636).
 * Calcula: Base64Url(SHA256(code_verifier)) y compara con code_challenge.
 */
export function verifyCodeChallenge(codeVerifier: string, expectedChallenge: string): boolean {
  const computedChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest('base64url');

  const computedBuffer = Buffer.from(computedChallenge);
  const expectedBuffer = Buffer.from(expectedChallenge);

  if (computedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
}

/**
 * Intercambia el authorization_code por tokens de acceso y refresco (Token Exchange).
 */
export function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}) {
  const authCodeData = authCodesStore.get(params.code);

  if (!authCodeData) {
    throw { status: 400, error: 'invalid_grant', message: 'El authorization_code no existe o ya fue utilizado.' };
  }

  // Eliminar inmediatamente para garantizar que el código es de un solo uso (Anti-Replay)
  authCodesStore.delete(params.code);
  authCodesByStateStore.delete(authCodeData.state);

  if (Date.now() > authCodeData.expiresAt) {
    throw { status: 400, error: 'invalid_grant', message: 'El authorization_code ha expirado.' };
  }

  if (authCodeData.clientId !== params.clientId) {
    throw { status: 400, error: 'invalid_client', message: 'El client_id no coincide.' };
  }

  // Validación estricta de PKCE (RFC 7636)
  const isVerifierValid = verifyCodeChallenge(params.codeVerifier, authCodeData.codeChallenge);
  if (!isVerifierValid) {
    throw {
      status: 400,
      error: 'invalid_grant',
      message: 'PKCE Verification Failed: SHA256(code_verifier) no coincide con el code_challenge.',
    };
  }

  // Emitir Access Token: 5 minutos (300 segundos) según Punto 2 del taller
  const accessToken = signJwt(
    {
      userId: authCodeData.userId,
      email: authCodeData.email,
      tokenType: 'access',
      mfa_verified: false,
    },
    300 // 5 minutos
  );

  // Emitir Refresh Token: 30 días según Punto 2 del taller
  const refreshToken = 'rt_' + crypto.randomBytes(32).toString('base64url');
  refreshTokensStore.set(refreshToken, {
    refreshToken,
    userId: authCodeData.userId,
    email: authCodeData.email,
    clientId: authCodeData.clientId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
    revoked: false,
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 300, // 5 minutos exactos
    refresh_token: refreshToken,
    scope: 'openid profile vault',
    user: DEFAULT_USER,
  };
}
