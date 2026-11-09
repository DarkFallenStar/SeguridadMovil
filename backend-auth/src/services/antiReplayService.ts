/**
 * Servicio de Caché Anti-Replay en Memoria (Punto 4 de la Guía de Laboratorio)
 * Registra los códigos TOTP ya validados por usuario con un TTL estricto de 90 segundos
 * (cubriendo las 3 ventanas temporales C-1, C y C+1 de 30s cada una).
 * Si un código se reutiliza antes de expirar su TTL, bloquea la solicitud para responder 409 Conflict.
 */

export const ANTI_REPLAY_TTL_MS = 90 * 1000; // 90 segundos exactos

interface ReplayRecord {
  userId: string;
  code: string;
  timeCounter: number;
  usedAt: number;
  expiresAt: number;
}

// Mapa nativo en memoria (Decisión 1A): Clave -> Registro de uso con expiración
const usedTotpCodesCache = new Map<string, ReplayRecord>();

/**
 * Elimina de la caché los códigos cuyo TTL de 90 segundos ya venció.
 */
function purgeExpiredCodes(nowMs: number = Date.now()): void {
  for (const [key, record] of usedTotpCodesCache.entries()) {
    if (record.expiresAt <= nowMs) {
      usedTotpCodesCache.delete(key);
    }
  }
}

/**
 * Verifica atómicamente si un código TOTP ya fue utilizado por el usuario dentro de la ventana de 90s.
 * - Si ya fue utilizado y sigue vigente, retorna `{ allowed: false, record }` (Replay Attack).
 * - Si es nuevo, lo registra en memoria con TTL de 90s y retorna `{ allowed: true }`.
 */
export function checkAndRegisterTotpCode(
  userId: string,
  code: string,
  timeCounter: number,
  nowMs: number = Date.now()
): { allowed: boolean; existingRecord?: ReplayRecord } {
  purgeExpiredCodes(nowMs);

  const normalizedCode = code.trim();
  const key = `${userId}:${normalizedCode}`;
  const existing = usedTotpCodesCache.get(key);

  if (existing && existing.expiresAt > nowMs) {
    return {
      allowed: false,
      existingRecord: existing,
    };
  }

  const record: ReplayRecord = {
    userId,
    code: normalizedCode,
    timeCounter,
    usedAt: nowMs,
    expiresAt: nowMs + ANTI_REPLAY_TTL_MS,
  };

  usedTotpCodesCache.set(key, record);
  return { allowed: true };
}

/**
 * Limpia la caché completa (útil para reiniciar suites de pruebas automatizadas).
 */
export function clearAntiReplayCache(): void {
  usedTotpCodesCache.clear();
}

