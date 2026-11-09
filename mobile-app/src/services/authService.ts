/**
 * Servicio de Autenticación Móvil (OAuth 2.0 + PKCE según RFC 7636 y RFC 6749)
 * Orquesta la generación de verifier/challenge, apertura del navegador seguro,
 * validación Anti-CSRF del state y el intercambio del código por tokens.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { CONFIG } from '../config';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateRandomState,
} from '../crypto/pkce';

export interface OAuthTokensResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
  message?: string;
}

/**
 * Inicia el flujo de autenticación OAuth 2.0 con PKCE delegando la identidad al
 * navegador nativo del sistema (Custom Tabs en Android / ASWebAuthenticationSession en iOS).
 * Queda estrictamente prohibido el uso de WebViews estándar.
 */
export async function loginWithOAuthPKCE(): Promise<OAuthTokensResult> {
  try {
    // 1. Generar code_verifier criptográficamente seguro (alta entropía, 64 chars)
    const codeVerifier = generateCodeVerifier(64);

    // 2. Generar code_challenge = Base64Url(SHA256(code_verifier)) sin padding
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // 3. Generar parámetro state aleatorio único para protección Anti-CSRF
    const state = generateRandomState(32);

    // 4. Construir la URL del Servidor de Autorización
    const queryParams = new URLSearchParams({
      response_type: CONFIG.OAUTH.RESPONSE_TYPE,
      client_id: CONFIG.OAUTH.CLIENT_ID,
      redirect_uri: CONFIG.OAUTH.REDIRECT_URI,
      scope: 'openid profile vault',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CONFIG.OAUTH.CODE_CHALLENGE_METHOD,
    });

    const authUrl = `${CONFIG.OAUTH.AUTHORIZE_ENDPOINT}?${queryParams.toString()}`;

    // 5. Abrir la sesión segura en el navegador del sistema operativo
    // WebBrowser.openAuthSessionAsync captura automáticamente la redirección al esquema unisabana-auth://
    const authResult = await WebBrowser.openAuthSessionAsync(
      authUrl,
      CONFIG.OAUTH.REDIRECT_URI
    );

    // 6. Manejar la respuesta del navegador del sistema
    if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      return {
        success: false,
        error: 'cancelled',
        message: 'El inicio de sesión fue cancelado por el usuario.',
      };
    }

    if (authResult.type !== 'success' || !authResult.url) {
      return {
        success: false,
        error: 'auth_failed',
        message: 'No se completó la sesión de autenticación en el navegador.',
      };
    }

    // 7. Parsear la URL de retorno del Deep Link: unisabana-auth://callback?code=...&state=...
    const parsed = Linking.parse(authResult.url);
    const returnedCode = parsed.queryParams?.code;
    const returnedState = parsed.queryParams?.state;

    if (!returnedCode || typeof returnedCode !== 'string') {
      return {
        success: false,
        error: 'missing_code',
        message: 'El proveedor de identidad no devolvió un authorization_code válido.',
      };
    }

    // 8. Validación Anti-CSRF estricta:
    // Si el state recibido no coincide exactamente con el generado en memoria, abortar inmediatamente.
    if (!returnedState || returnedState !== state) {
      return {
        success: false,
        error: 'csrf_detected',
        message: 'Ataque CSRF detectado: el parámetro state recibido no coincide con el generado en memoria.',
      };
    }

    // 9. Token Exchange (Intercambio de Código por Tokens en Backend):
    // Se envía el authorization_code junto con el code_verifier original
    const tokenResponse = await fetch(CONFIG.OAUTH.TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: returnedCode,
        code_verifier: codeVerifier,
        client_id: CONFIG.OAUTH.CLIENT_ID,
        redirect_uri: CONFIG.OAUTH.REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return {
        success: false,
        error: tokenData.error || 'token_exchange_failed',
        message: tokenData.message || 'Error durante el intercambio de tokens en el servidor.',
      };
    }

    // 10. Retornar tokens legítimos emitidos por el backend
    return {
      success: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      user: tokenData.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'exception',
      message: error?.message || 'Error inesperado durante el flujo OAuth PKCE.',
    };
  }
}
