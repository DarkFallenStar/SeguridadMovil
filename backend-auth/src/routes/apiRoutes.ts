import { Router, Request, Response } from 'express';
import { requireAccessToken } from '../middleware/authMiddleware.js';
import { signJwt } from '../services/jwtService.js';
import { DEFAULT_USER } from '../services/oauthService.js';

export const apiRouter = Router();

// Contador de llamadas a la ruta protegida para auditoría de concurrencia
export let protectedResourceCallsCount = 0;

export function resetProtectedCallsCount() {
  protectedResourceCallsCount = 0;
}

/**
 * GET /api/test-protected
 * Endpoint protegido con requireAccessToken.
 * Si el access_token expiró, responde 401 Unauthorized para activar la Silent Refresh Queue.
 */
apiRouter.get('/test-protected', requireAccessToken, (req: Request, res: Response) => {
  protectedResourceCallsCount++;
  console.log(`[API SERVER] 🔒 Petición autorizada a /api/test-protected (#${protectedResourceCallsCount}) para ${req.user?.email}`);

  return res.status(200).json({
    status: 'success',
    message: 'Acceso autorizado a recurso protegido.',
    user: req.user,
    timestamp: new Date().toISOString(),
    callNumber: protectedResourceCallsCount,
  });
});

/**
 * POST /api/test-force-expire
 * Endpoint de prueba para sustentar el laboratorio:
 * Emite un access_token que ya expiró hace 60 segundos, permitiendo simular
 * respuestas 401 y demostrar la Silent Refresh Queue sin tener que esperar 5 minutos.
 */
apiRouter.post('/test-force-expire', (req: Request, res: Response) => {
  // Emite un token con expiración negativa (-60 segundos)
  const expiredToken = signJwt(
    {
      userId: DEFAULT_USER.id,
      email: DEFAULT_USER.email,
      tokenType: 'access',
      mfa_verified: false,
    },
    -60 // Expiró hace 1 minuto
  );

  return res.status(200).json({
    expired_access_token: expiredToken,
    message: 'Token expirado emitido para pruebas de Silent Refresh.',
  });
});

/**
 * GET /api/boveda-critica (y alias GET /api/boveda según Sección 2 y Punto 4 de la Guía)
 * Protegido mediante Step-Up Authentication:
 * - Si mfa_verified === false: responde 403 Forbidden con error: "mfa_required" y un step_up_token.
 * - Si mfa_verified === true: responde 200 OK con los secretos de la Bóveda Crítica.
 */
apiRouter.get(['/boveda-critica', '/boveda'], requireAccessToken, (req: Request, res: Response) => {
  const user = req.user!;

  if (!user.mfa_verified) {
    // Emitir step_up_token temporal (vigencia corta de 2 minutos para completar el desafío 2FA)
    const stepUpToken = signJwt(
      {
        userId: user.userId,
        email: user.email,
        tokenType: 'step_up',
        mfa_verified: false,
      },
      120
    );

    console.log(`[VAULT GUARD] 🛡️ Acceso denegado (403 mfa_required) para ${user.email}. Emitiendo step_up_token.`);

    return res.status(403).json({
      error: 'mfa_required',
      message: 'Este recurso crítico requiere elevación de privilegios mediante segundo factor TOTP (Step-Up 2FA).',
      step_up_token: stepUpToken,
    });
  }

  console.log(`[VAULT GUARD] 🔓 Acceso elevado concedido a Bóveda Crítica para ${user.email} (mfa_verified: true).`);

  return res.status(200).json({
    secretData: 'LLAVE-MAESTRA-UNISABANA-2026-AES256-GCM-9F8A7B6C',
    classification: 'TOP_SECRET',
    accessedAt: new Date().toISOString(),
    authorizedUser: user.email,
  });
});


