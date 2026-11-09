/**
 * Servicio de Autenticación Móvil (OAuth 2.0 + PKCE según RFC 7636 y RFC 6749)
 * Orquesta la generación de verifier/challenge, apertura del navegador seguro,
 * validación Anti-CSRF del state y el intercambio del código por tokens.
 */

import { Platform } from 'react-native';
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
 * Extrae parámetros code y state de manera segura tanto desde esquemas exp://,
 * unisabana-auth:// como URLs HTTP.
 */
function extractCodeAndState(callbackUrl: string): { code: string | null; state: string | null } {
  try {
    const parsed = Linking.parse(callbackUrl);
    const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
    const state = typeof parsed.queryParams?.state === 'string' ? parsed.queryParams.state : null;
    if (code || state) {
      return { code, state };
    }
  } catch {
    // Fallback regex parsing si Linking.parse falla con algún formato
  }

  const codeMatch = callbackUrl.match(/[?&]code=([^&#]+)/);
  const stateMatch = callbackUrl.match(/[?&]state=([^&#]+)/);
  return {
    code: codeMatch ? decodeURIComponent(codeMatch[1]) : null,
    state: stateMatch ? decodeURIComponent(stateMatch[1]) : null,
  };
}

/**
 * Inicia el flujo de autenticación OAuth 2.0 con PKCE delegando la identidad al
 * navegador nativo del sistema (Custom Tabs en Android / ASWebAuthenticationSession en iOS).
 * Queda estrictamente prohibido el uso de WebViews estándar.
 */
export async function loginWithOAuthPKCE(): Promise<OAuthTokensResult> {
  let linkingSubscription: { remove: () => void } | null = null;
  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  try {
    // 1. Generar code_verifier criptográficamente seguro (alta entropía, 64 chars)
    const codeVerifier = generateCodeVerifier(64);

    // 2. Generar code_challenge = Base64Url(SHA256(code_verifier)) sin padding
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // 3. Generar parámetro state aleatorio único para protección Anti-CSRF
    const state = generateRandomState(32);

    // 4. Resolver dinámicamente el redirect_uri:
    // En Expo Go genera exp://... (reconocido por el SO para Expo Go).
    // En standalone build genera unisabana-auth://callback.
    const dynamicRedirectUri = Linking.createURL('callback');
    console.log('[OAuth PKCE] Redirect URI resuelta:', dynamicRedirectUri);

    // 5. Construir la URL del Servidor de Autorización
    const queryParams = new URLSearchParams({
      response_type: CONFIG.OAUTH.RESPONSE_TYPE,
      client_id: CONFIG.OAUTH.CLIENT_ID,
      redirect_uri: dynamicRedirectUri,
      scope: 'openid profile vault',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CONFIG.OAUTH.CODE_CHALLENGE_METHOD,
    });

    const authUrl = `${CONFIG.OAUTH.AUTHORIZE_ENDPOINT}?${queryParams.toString()}`;

    // 6. Suscribirse proactivamente a eventos de Deep Link
    let capturedDeepLinkUrl: string | null = null;
    linkingSubscription = Linking.addEventListener('url', (event) => {
      console.log('[OAuth DeepLink Listener] Evento URL capturado:', event.url);
      if (event.url && event.url.includes('code=')) {
        capturedDeepLinkUrl = event.url;
      }
    });

    // 7. En Android, configurar createTask: false para que la Custom Tab se abra en la misma
    // pila de actividad (singleTask) de Expo Go; así, al activarse el intent de retorno,
    // Android cierra automáticamente la pestaña del navegador sin intervención manual.
    const browserOptions: WebBrowser.WebBrowserOpenOptions = {
      createTask: false,
      showInRecents: false,
    };

    if (Platform.OS === 'android') {
      try {
        const browsers = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
        if (browsers.browserPackages.includes('com.android.chrome')) {
          browserOptions.browserPackage = 'com.android.chrome';
        } else if (browsers.preferredBrowserPackage) {
          browserOptions.browserPackage = browsers.preferredBrowserPackage;
        }
      } catch {
        // Fallback al navegador predeterminado del sistema
      }
    }

    // 8. Monitoreo reactivo mientras el navegador está abierto:
    // Apenas el usuario toca el botón "Autorizar" en el navegador, detectamos el cambio
    // en /oauth/session-status y disparamos Linking.openURL desde React Native para
    // traer Expo Go al frente y cerrar el Custom Tab automáticamente.
    const approvalWatcher = new Promise<string>((resolve) => {
      pollingInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${CONFIG.API_BASE_URL}/oauth/session-status?state=${encodeURIComponent(state)}`
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.approved && statusData.callbackUrl) {
              if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
              }
              capturedDeepLinkUrl = statusData.callbackUrl;
              // Traer la actividad de Expo Go al frente (cierra el Custom Tab con createTask: false)
              Linking.openURL(statusData.callbackUrl).catch(() => {});
              resolve(statusData.callbackUrl);
            }
          }
        } catch {
          // Ignorar errores transitorios mientras se espera
        }
      }, 400);
    });

    // 9. Abrir la sesión segura en el navegador del sistema operativo
    const raceResult = await Promise.race([
      WebBrowser.openAuthSessionAsync(authUrl, dynamicRedirectUri, browserOptions),
      approvalWatcher.then((url) => ({ type: 'success' as const, url })),
    ]);

    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    let finalCallbackUrl: string | null = null;

    if (raceResult.type === 'success' && raceResult.url) {
      finalCallbackUrl = raceResult.url;
    } else if (capturedDeepLinkUrl) {
      finalCallbackUrl = capturedDeepLinkUrl;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (capturedDeepLinkUrl) {
        finalCallbackUrl = capturedDeepLinkUrl;
      }
    }

    // 10. Verificación final por si el navegador se cerró justo al aprobar
    if (!finalCallbackUrl) {
      try {
        const statusRes = await fetch(
          `${CONFIG.API_BASE_URL}/oauth/session-status?state=${encodeURIComponent(state)}`
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.approved && statusData.callbackUrl) {
            finalCallbackUrl = statusData.callbackUrl;
          }
        }
      } catch {
        // Ignorar si no hay sesión aprobada
      }
    }

    // Si después de verificar todas las vías no hay URL de callback, el usuario canceló sin autorizar
    if (!finalCallbackUrl) {
      return {
        success: false,
        error: 'cancelled',
        message: 'El inicio de sesión fue cancelado sin completar la autorización.',
      };
    }

    // 9. Extraer code y state de la URL de retorno
    const { code: returnedCode, state: returnedState } = extractCodeAndState(finalCallbackUrl);

    if (!returnedCode) {
      return {
        success: false,
        error: 'missing_code',
        message: 'El proveedor de identidad no devolvió un authorization_code válido.',
      };
    }

    // 10. Validación Anti-CSRF estricta:
    // Si el state recibido no coincide exactamente con el generado en memoria, abortar inmediatamente.
    if (!returnedState || returnedState !== state) {
      return {
        success: false,
        error: 'csrf_detected',
        message: 'Ataque CSRF detectado: el parámetro state recibido no coincide con el generado en memoria.',
      };
    }

    // 11. Token Exchange (Intercambio de Código por Tokens en Backend):
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
        redirect_uri: dynamicRedirectUri,
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

    // 12. Retornar tokens legítimos emitidos por el backend
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
  } finally {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    linkingSubscription?.remove();
  }
}
