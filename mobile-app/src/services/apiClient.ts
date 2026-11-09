/**
 * Cliente HTTP Centralizado con Interceptor de Red y Silent Refresh Queue.
 * Cumple con el Punto 2 de la Guía de Laboratorio:
 * 1. Pausa llamadas subsecuentes al detectar 401 y encola peticiones concurrentes.
 * 2. Dispara una ÚNICA petición de renovación POST /auth/refresh.
 * 3. Actualiza el access_token en memoria volátil (RAM) y desbloquea la cola reintentando todo.
 * 4. Si el refresh_token es revocado o expira, limpia SecureStore y RAM y emite logout.
 */

import { CONFIG } from '../config';
import { tokenMemoryStore } from './tokenMemoryStore';
import { secureStorageService } from './secureStorageService';

interface QueuedPromise {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}

let isRefreshing = false;
let failedQueue: QueuedPromise[] = [];

// Callback global para forzar cierre de sesión cuando el refresh_token expira o es revocado
let onSessionExpiredListener: (() => void) | null = null;

export function setOnSessionExpiredListener(listener: (() => void) | null) {
  onSessionExpiredListener = listener;
}

/**
 * Procesa y vacía la cola de promesas en espera.
 */
function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Wrapper de peticiones HTTP con interceptor automático para renovación transparente.
 */
export async function apiFetch(
  endpointOrUrl: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpointOrUrl.startsWith('http')
    ? endpointOrUrl
    : `${CONFIG.API_BASE_URL}${endpointOrUrl.startsWith('/') ? '' : '/'}${endpointOrUrl}`;

  // 1. Adjuntar access_token desde memoria volátil (RAM) si está disponible
  const headers = new Headers(options.headers || {});
  const currentAccessToken = tokenMemoryStore.getAccessToken();

  if (currentAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  // 2. Disparar petición inicial
  let response = await fetch(url, {
    ...options,
    headers,
  });

  // 3. Interceptar respuestas HTTP 401 Unauthorized
  if (response.status === 401) {
    console.log(`[HTTP Interceptor] ⚠️ 401 Unauthorized detectado en: ${url}`);

    // Si ya existe una renovación de token en curso, encolar la promesa
    if (isRefreshing) {
      console.log(`[Silent Refresh Queue] ⏳ Encolando petición concurrente en vuelo: ${url}`);
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newAccessToken) => {
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
        console.log(`[Silent Refresh Queue] 🚀 Reintentando petición encolada con nuevo token: ${url}`);
        return fetch(url, { ...options, headers: retryHeaders });
      });
    }

    // Si somos la primera petición en recibir 401, liderar el proceso de Silent Refresh
    isRefreshing = true;
    console.log(`[Silent Refresh Queue] 🔄 Iniciando única solicitud de renovación POST /auth/refresh...`);

    try {
      // Recuperar el refresh_token cifrado desde el hardware seguro (Keychain/Keystore)
      const refreshToken = await secureStorageService.getRefreshToken();

      if (!refreshToken) {
        console.warn(`[Silent Refresh] No existe refresh_token en SecureStore. Cierre de sesión requerido.`);
        tokenMemoryStore.clear();
        processQueue(new Error('Sesión no encontrada'), null);
        onSessionExpiredListener?.();
        return response;
      }

      // Disparar ÚNICA llamada al backend para renovar sesión
      const refreshResponse = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshResponse.ok) {
        // El refresh_token expiró o fue revocado
        console.error(`[Silent Refresh] ❌ Renovación rechazada por el servidor (${refreshResponse.status}).`);
        tokenMemoryStore.clear();
        await secureStorageService.deleteRefreshToken();
        processQueue(new Error('Sesión expirada o revocada'), null);
        onSessionExpiredListener?.();
        return response;
      }

      const refreshData = await refreshResponse.json();
      const newAccessToken = refreshData.access_token;
      const expiresIn = refreshData.expires_in || 300; // 5 minutos exactos

      // 4. Actualizar el access_token ÚNICAMENTE en la memoria RAM
      tokenMemoryStore.setAccessToken(newAccessToken, expiresIn);
      console.log(`[Silent Refresh] ✅ access_token renovado en memoria volátil (expira en ${expiresIn}s).`);

      // 5. Desbloquear y resolver todas las promesas que estaban encoladas
      processQueue(null, newAccessToken);

      // 6. Reintentar la petición original que disparó el 401
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      console.log(`[Silent Refresh] 🔁 Reintentando petición original con nuevo token: ${url}`);
      return await fetch(url, { ...options, headers: retryHeaders });
    } catch (err) {
      console.error(`[Silent Refresh Error] Fallo inesperado:`, err);
      processQueue(err, null);
      tokenMemoryStore.clear();
      await secureStorageService.deleteRefreshToken();
      onSessionExpiredListener?.();
      return response;
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}

