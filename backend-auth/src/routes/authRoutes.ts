import { Router, Request, Response } from 'express';
import { refreshTokensStore, DEFAULT_USER } from '../services/oauthService.js';
import { signJwt, verifyJwt } from '../services/jwtService.js';
import { tokenController } from '../controllers/oauthController.js';
import {
  getUserTotpSecret,
  setUserTotpSecret,
  buildOtpAuthUri,
  generateTOTP,
  verifyTOTPWithClockSkew,
} from '../services/totpValidator.js';
import { checkAndRegisterTotpCode } from '../services/antiReplayService.js';

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

/**
 * GET /auth/mfa/setup
 * Entrega la configuración de aprovisionamiento TOTP (URI otpauth:// y código QR escaneable)
 * para demostrar en vivo la Prueba de Aceptación #2 (escaneo simultáneo en App y Google Authenticator).
 */
authRouter.get('/mfa/setup', (req: Request, res: Response) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : DEFAULT_USER.id;
  const secret = getUserTotpSecret(userId);
  const otpauthUri = buildOtpAuthUri(secret, DEFAULT_USER.email, 'UniSabana');
  const currentCode = generateTOTP(secret);

  if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
    return res.status(200).json({
      userId,
      email: DEFAULT_USER.email,
      issuer: 'UniSabana',
      secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      otpauthUri,
      currentServerCode: currentCode,
    });
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(otpauthUri)}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aprovisionamiento QR TOTP — UniSabana</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0F172A;
      color: #F8FAFC;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background-color: #1E293B;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 28px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 30px rgba(0,0,0,0.35);
    }
    .badge {
      display: inline-block;
      background-color: #38BDF8;
      color: #0F172A;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 12px;
      margin-bottom: 12px;
    }
    h1 { font-size: 20px; margin: 0 0 8px 0; }
    p { font-size: 13px; color: #94A3B8; margin: 0 0 18px 0; line-height: 18px; }
    .qr-box {
      background: #FFFFFF;
      padding: 14px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 18px;
    }
    .meta {
      background: #0F172A;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      margin-bottom: 14px;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 6px; gap: 10px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #64748B; }
    .val { color: #38BDF8; font-family: monospace; font-weight: 700; word-break: break-all; text-align: right; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">FASE 5 • APROVISIONAMIENTO TOTP (RFC 6238)</div>
    <h1>Escanea con tu App y Google Authenticator</h1>
    <p>Apunta la cámara de tu app móvil ("📷 Escanear QR") y de Google Authenticator a este código QR para demostrar 100% de paridad.</p>
    <div class="qr-box">
      <img src="${qrImageUrl}" width="220" height="220" alt="QR otpauth://totp/" />
    </div>
    <div class="meta">
      <div class="row"><span class="label">Cuenta:</span><span class="val">${DEFAULT_USER.email}</span></div>
      <div class="row"><span class="label">Semilla Base32:</span><span class="val">${secret}</span></div>
      <div class="row"><span class="label">Parámetros:</span><span class="val">SHA1 • 6 dígitos • 30s</span></div>
      <div class="row"><span class="label">URI completa:</span><span class="val">${otpauthUri}</span></div>
    </div>
  </div>
</body>
</html>`;

  return res.status(200).send(html);
});

/**
 * POST /auth/mfa/setup
 * Sincroniza en el servidor la semilla Base32 o URI otpauth:// configurada por el usuario en su dispositivo.
 */
authRouter.post('/mfa/setup', (req: Request, res: Response) => {
  try {
    const { secret, userId } = req.body;
    if (!secret || typeof secret !== 'string') {
      return res.status(400).json({
        error: 'invalid_secret',
        message: 'Se requiere una semilla Base32 o URI otpauth:// válida.',
      });
    }

    const targetUserId = typeof userId === 'string' && userId ? userId : DEFAULT_USER.id;
    const parsed = setUserTotpSecret(targetUserId, secret);

    console.log(`[AUTH SERVER] 🔐 Semilla TOTP sincronizada para ${targetUserId} (issuer: ${parsed.issuer})`);

    return res.status(200).json({
      status: 'ok',
      message: 'Semilla TOTP validada y sincronizada en el servidor.',
      secret: parsed.secret,
      issuer: parsed.issuer,
      label: parsed.label,
      otpauthUri: parsed.otpauthUri,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: 'invalid_totp_config',
      message: err?.message || 'Configuración TOTP incompatible.',
    });
  }
});

/**
 * POST /auth/mfa/verify
 * Verificación de Segundo Factor TOTP (Step-Up Authentication) y Protección Anti-Replay:
 * 1. Valida el step_up_token.
 * 2. Verifica el código TOTP de 6 dígitos en las tres ventanas C-1, C y C+1 (Clock Skew).
 * 3. Consulta la Caché Anti-Replay (TTL 90s): si ya fue usado, devuelve 409 Conflict.
 * 4. Emite el elevated_token con claim mfa_verified: true (expiración corta: 10 minutos = 600s).
 */
authRouter.post('/mfa/verify', (req: Request, res: Response) => {
  const { step_up_token, code, totp_code } = req.body;
  const submittedCode = String(code ?? totp_code ?? '').trim();

  if (!step_up_token || typeof step_up_token !== 'string' || !submittedCode) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Se requieren step_up_token y el código TOTP de 6 dígitos.',
    });
  }

  const tokenVerification = verifyJwt(step_up_token);
  if (!tokenVerification.valid || !tokenVerification.payload) {
    return res.status(401).json({
      error: 'invalid_step_up_token',
      message: tokenVerification.error || 'El step_up_token es inválido o ha expirado.',
    });
  }

  const { userId, email, tokenType } = tokenVerification.payload;
  if (tokenType !== 'step_up') {
    return res.status(401).json({
      error: 'invalid_token_type',
      message: 'El token proporcionado no corresponde a un desafío step_up.',
    });
  }

  const userSecret = getUserTotpSecret(userId);
  const totpCheck = verifyTOTPWithClockSkew(submittedCode, userSecret);

  if (!totpCheck.valid || totpCheck.matchedCounter === undefined) {
    console.warn(`[MFA VERIFY] ❌ Código TOTP inválido (${submittedCode}) para ${email}`);
    return res.status(401).json({
      error: 'invalid_totp_code',
      message: 'Código TOTP inválido o fuera de las ventanas de tolerancia (C-1, C, C+1).',
    });
  }

  // Control Anti-Replay en Memoria (TTL de 90 segundos)
  const replayCheck = checkAndRegisterTotpCode(userId, submittedCode, totpCheck.matchedCounter);
  if (!replayCheck.allowed) {
    console.warn(`[ANTI-REPLAY] 🚨 409 Conflict: Replay Attack Detectado para ${email} con código ${submittedCode}`);
    return res.status(409).json({
      error: 'replay_attack_detected',
      message: '409 Conflict: Replay Attack Detected. Este código TOTP ya fue utilizado dentro de los últimos 90 segundos.',
    });
  }

  // Emitir elevated_token con claim mfa_verified: true y vigencia de 10 minutos (600 segundos)
  const elevatedToken = signJwt(
    {
      userId,
      email,
      tokenType: 'elevated',
      mfa_verified: true,
    },
    600
  );

  console.log(
    `[MFA VERIFY] ✅ Step-Up 2FA exitoso para ${email} (ventana C${totpCheck.windowOffset! >= 0 ? '+' : ''}${totpCheck.windowOffset}). Emitido elevated_token (10 min).`
  );

  return res.status(200).json({
    elevated_token: elevatedToken,
    access_token: elevatedToken,
    token_type: 'Bearer',
    expires_in: 600,
    mfa_verified: true,
    window_offset: totpCheck.windowOffset,
  });
});


