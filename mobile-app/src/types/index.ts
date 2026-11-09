/**
 * Tipos de datos compartidos de la aplicacion movil
 */

export type ScreenName = 'LOGIN' | 'DASHBOARD' | 'VAULT' | 'TOTP';

export interface UserSession {
  userId: string;
  email: string;
  accessToken: string | null; // Vive estrictamente en memoria volátil (RAM)
  accessTokenExpiresAt: number | null; // Timestamp en ms
  hasRefreshToken: boolean; // Indica si existe refresh_token en SecureStore
  mfaVerified: boolean;
}

export interface VaultRecord {
  secretData: string;
  classification: string;
  accessedAt: string;
  authorizedUser: string;
}

export interface ApiError {
  error: string;
  message?: string;
  step_up_token?: string;
}
