/**
 * Almacenamiento en Memoria Volátil (RAM) del access_token.
 * Cumple estrictamente con el Punto 2 del taller:
 * "access_token vive únicamente en memoria volátil de la app (React State, Context, ViewModel).
 *  Se destruye al matar el proceso. Vida útil: 5 minutos."
 *
 * Queda PROHIBIDO persistir este token en AsyncStorage, SecureStore o texto plano.
 */

let inMemoryAccessToken: string | null = null;
let inMemoryAccessTokenExpiresAt: number | null = null;

export const tokenMemoryStore = {
  /**
   * Obtiene el access_token almacenado en RAM.
   */
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },

  /**
   * Obtiene la fecha de expiración en timestamp (ms).
   */
  getExpiresAt(): number | null {
    return inMemoryAccessTokenExpiresAt;
  },

  /**
   * Almacena el access_token exclusivamente en memoria volátil.
   * @param token JWT emitido por el backend
   * @param expiresInSeconds Vida útil en segundos (por defecto 300 = 5 min)
   */
  setAccessToken(token: string | null, expiresInSeconds: number = 300): void {
    inMemoryAccessToken = token;
    inMemoryAccessTokenExpiresAt = token ? Date.now() + expiresInSeconds * 1000 : null;
  },

  /**
   * Destruye el access_token de la memoria.
   */
  clear(): void {
    inMemoryAccessToken = null;
    inMemoryAccessTokenExpiresAt = null;
  },

  /**
   * Indica si el access_token en memoria ya expiró.
   */
  isExpired(): boolean {
    if (!inMemoryAccessToken || !inMemoryAccessTokenExpiresAt) {
      return true;
    }
    // Margen de seguridad de 5 segundos antes de la expiración real
    return Date.now() >= inMemoryAccessTokenExpiresAt - 5000;
  },
};

