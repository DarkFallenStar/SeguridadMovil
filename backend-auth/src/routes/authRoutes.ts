import { Router, Request, Response } from 'express';
import { refreshTokensStore, DEFAULT_USER } from '../services/oauthService.js';
import { signJwt } from '../services/jwtService.js';
import { tokenController } from '../controllers/oauthController.js';

export const authRouter = Router();

// Alias compatible con la Sección 2 de la Guía (POST /auth/oauth/token)
authRouter.post('/oauth/token', tokenController);

// Contador de renovaciones para auditoría en pruebas de concurrencia
export let refreshRequestsCount = 0;

export function resetRefreshCount() {
  refreshRequestsCount = 0;
}

/**
 * POST /auth/refresh
 * Pipeline de Silent Refresh: Recibe el refresh_token persistido en SecureStore y emite
 * un nuevo access_token con vida útil exacta de 5 minutos (300 segundos).
 */
authRouter.post('/refresh', (req: Request, res: Response) => {
  refreshRequestsCount++;
  console.log(`[AUTH SERVER] 🔄 Solicitud POST /auth/refresh recibida (#${refreshRequestsCount})`);

  const { refresh_token } = req.body;

  if (!refresh_token || typeof refresh_token !== 'string') {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'El campo refresh_token es obligatorio.',
    });
  }

  const tokenRecord = refreshTokensStore.get(refresh_token);

  if (!tokenRecord) {
    return res.status(401).json({
      error: 'invalid_refresh_token',
      message: 'El refresh_token no existe en el registro del servidor.',
    });
  }

  if (tokenRecord.revoked) {
    return res.status(401).json({
      error: 'refresh_token_revoked',
      message: 'El refresh_token ha sido revocado. Se requiere iniciar sesión nuevamente.',
    });
  }

  if (Date.now() > tokenRecord.expiresAt) {
    refreshTokensStore.delete(refresh_token);
    return res.status(401).json({
      error: 'refresh_token_expired',
      message: 'El refresh_token ha superado sus 30 días de vigencia.',
    });
  }

  // Emitir un nuevo Access Token de 5 minutos (300 segundos)
  const newAccessToken = signJwt(
    {
      userId: tokenRecord.userId,
      email: tokenRecord.email,
      tokenType: 'access',
      mfa_verified: false,
    },
    300 // 5 minutos exactos
  );

  return res.status(200).json({
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: 300,
    user: {
      id: tokenRecord.userId,
      email: tokenRecord.email,
      name: DEFAULT_USER.name,
    },
  });
});

/**
 * POST /auth/logout
 * Revoca el refresh_token y cierra la sesión en el servidor.
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (refresh_token && refreshTokensStore.has(refresh_token)) {
    const record = refreshTokensStore.get(refresh_token)!;
    record.revoked = true;
    console.log(`[AUTH SERVER] 🔒 Refresh token revocado para el usuario: ${record.email}`);
  }

  return res.status(200).json({
    message: 'Sesión revocada exitosamente en el servidor.',
  });
});

