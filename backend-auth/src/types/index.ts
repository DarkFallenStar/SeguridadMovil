/**
 * Contratos y tipos globales compartidos en backend-auth
 */

export interface HealthResponse {
  status: 'ok';
  service: 'backend-auth';
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  step_up_token?: string; // Emitido cuando error === "mfa_required"
}

export interface VaultData {
  secretData: string;
  classification: 'TOP_SECRET';
  accessedAt: string;
  authorizedUser: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  mfa_verified: boolean;
  tokenType: 'access' | 'refresh' | 'step_up' | 'elevated';
  iat?: number;
  exp?: number;
}
