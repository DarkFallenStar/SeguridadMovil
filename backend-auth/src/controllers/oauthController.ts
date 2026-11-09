import { Request, Response } from 'express';
import {
  createAuthorizationCode,
  approveAuthorizationCode,
  getApprovedAuthCodeByState,
  exchangeCodeForTokens,
  DEFAULT_USER,
} from '../services/oauthService.js';

/**
 * Construye el enlace Deep Link estándar y el enlace Android Intent explícito para Expo Go.
 */
function buildDeepLinks(redirectUri: string, code: string, state: string) {
  const separator = redirectUri.includes('?') ? '&' : '?';
  const targetDeepLink = `${redirectUri}${separator}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

  let androidIntentLink = targetDeepLink;
  if (targetDeepLink.startsWith('exp://')) {
    const withoutScheme = targetDeepLink.replace(/^exp:\/\//, '');
    androidIntentLink = `intent://${withoutScheme}#Intent;scheme=exp;package=host.exp.exponent;end`;
  } else if (targetDeepLink.startsWith('unisabana-auth://')) {
    const withoutScheme = targetDeepLink.replace(/^unisabana-auth:\/\//, '');
    androidIntentLink = `intent://${withoutScheme}#Intent;scheme=unisabana-auth;end`;
  }

  return { targetDeepLink, androidIntentLink };
}

/**
 * GET /oauth/authorize
 * Renderiza la pantalla de consentimiento del Servidor de Autorización en el navegador del sistema.
 */
export function authorizeGetController(req: Request, res: Response) {
  const {
    client_id,
    redirect_uri,
    response_type,
    code_challenge,
    code_challenge_method,
    state,
  } = req.query;

  console.log(`\n===================================================`);
  console.log(`[OAUTH SERVER] 📥 GET /oauth/authorize recibido:`);
  console.log(` - client_id:             ${client_id}`);
  console.log(` - redirect_uri:          ${redirect_uri}`);
  console.log(` - code_challenge (PKCE): ${code_challenge}`);
  console.log(` - state (Anti-CSRF):     ${state}`);
  console.log(`===================================================\n`);

  if (!client_id || client_id !== 'unisabana-mobile-client') {
    return res.status(400).send('Error OAuth: client_id inválido o ausente.');
  }

  if (!redirect_uri || typeof redirect_uri !== 'string') {
    return res.status(400).send('Error OAuth: redirect_uri requerida.');
  }

  if (response_type !== 'code') {
    return res.status(400).send('Error OAuth: response_type no soportado. Se requiere "code".');
  }

  if (!code_challenge || typeof code_challenge !== 'string') {
    return res.status(400).send('Error PKCE: code_challenge requerido (RFC 7636).');
  }

  if (code_challenge_method !== 'S256') {
    return res.status(400).send('Error PKCE: code_challenge_method debe ser "S256".');
  }

  if (!state || typeof state !== 'string') {
    return res.status(400).send('Error OAuth: parámetro state requerido para protección Anti-CSRF.');
  }

  // Generar el authorization_code vinculado al code_challenge (pendiente de clic de aprobación)
  const code = createAuthorizationCode({
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: 'S256',
    state,
    approved: false,
  });

  const { targetDeepLink, androidIntentLink } = buildDeepLinks(redirect_uri, code, state);
  const isAndroid = /android/i.test(String(req.headers['user-agent'] || ''));
  const primaryReturnLink = isAndroid ? androidIntentLink : targetDeepLink;
  const approveApiUrl = `/oauth/approve?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&mode=json`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iniciar Sesión — UniSabana Auth</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #F8FAFC;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background-color: #1E293B;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .badge {
      display: inline-block;
      background-color: #38BDF8;
      color: #0F172A;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 8px 0;
      color: #F8FAFC;
    }
    p {
      color: #94A3B8;
      font-size: 13px;
      line-height: 18px;
      margin: 0 0 16px 0;
    }
    .details {
      background-color: #0F172A;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 12px;
      color: #CBD5E1;
      text-align: left;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      gap: 8px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #64748B;
      flex-shrink: 0;
    }
    .value {
      font-family: monospace;
      font-weight: 600;
      color: #38BDF8;
      word-break: break-all;
      text-align: right;
    }
    .btn {
      display: block;
      width: 100%;
      background-color: #2563EB;
      color: #FFFFFF;
      text-decoration: none;
      border: none;
      border-radius: 10px;
      padding: 15px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-sizing: border-box;
      transition: background-color 0.15s ease;
    }
    .btn:active {
      background-color: #1D4ED8;
    }
    .btn-success {
      background-color: #22C55E !important;
      color: #0F172A !important;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Navegador Seguro • RFC 7636</div>
    <h1 id="title-text">Iniciar Sesión UniSabana</h1>
    <p id="subtitle-text">La aplicación móvil solicita autorización delegada mediante OAuth 2.0 + PKCE.</p>

    <div class="details">
      <div class="detail-row">
        <span class="label">Usuario:</span>
        <span class="value">${DEFAULT_USER.email}</span>
      </div>
      <div class="detail-row">
        <span class="label">Cliente:</span>
        <span class="value">${client_id}</span>
      </div>
      <div class="detail-row">
        <span class="label">PKCE Challenge:</span>
        <span class="value">${code_challenge.substring(0, 16)}...</span>
      </div>
      <div class="detail-row">
        <span class="label">Retorno:</span>
        <span class="value">${redirect_uri}</span>
      </div>
    </div>

    <a href="${primaryReturnLink}" class="btn" id="btn-autorizar">
      Autorizar y Regresar a la App Móvil
    </a>
  </div>

  <script>
    (function() {
      var btn = document.getElementById('btn-autorizar');
      var approveUrl = ${JSON.stringify(approveApiUrl)};
      var deepLink = ${JSON.stringify(targetDeepLink)};
      var notified = false;

      function notifyApproval() {
        if (notified) return;
        notified = true;
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon(approveUrl);
          }
          fetch(approveUrl, { method: 'GET', keepalive: true }).catch(function() {});
        } catch (e) {}
      }

      // Notificar al backend apenas el dedo toca el botón (antes del click)
      // sin cancelar el gesto nativo del enlace <a> hacia el Intent/DeepLink
      btn.addEventListener('touchstart', notifyApproval, { passive: true });
      btn.addEventListener('pointerdown', notifyApproval, { passive: true });
      btn.addEventListener('mousedown', notifyApproval, { passive: true });

      btn.addEventListener('click', function() {
        notifyApproval();
        btn.classList.add('btn-success');
        btn.textContent = '✅ ¡Autorizado! Regresando a la App...';

        // Respaldo inmediato por si el navegador prefiere el esquema directo exp:// o window.close()
        setTimeout(function() {
          window.location.href = deepLink;
          setTimeout(function() {
            try { window.close(); } catch (e) {}
          }, 200);
        }, 250);
      });
    })();
  </script>
</body>
</html>`;

  return res.send(html);
}

/**
 * GET /oauth/approve
 * Registra la aprobación del usuario en el servidor y ejecuta el retorno inmediato hacia la App.
 */
export function approveGetController(req: Request, res: Response) {
  const { code, state, mode } = req.query;

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    return res.status(400).send('Parámetros de aprobación inválidos.');
  }

  const record = approveAuthorizationCode(code, state);
  if (!record) {
    return res.status(400).send('La sesión de autorización expiró o no es válida. Vuelve a la app e intenta de nuevo.');
  }

  const { targetDeepLink } = buildDeepLinks(record.redirectUri, record.code, record.state);

  console.log(`[OAUTH SERVER] ✅ Usuario autorizó sesión en el navegador (state: ${state}).`);
  console.log(`[OAUTH SERVER] 🚀 Redirigiendo a Deep Link: ${targetDeepLink}`);

  if (mode === 'json') {
    return res.status(200).json({
      approved: true,
      code: record.code,
      state: record.state,
      callbackUrl: targetDeepLink,
    });
  }

  return res.redirect(302, targetDeepLink);
}

/**
 * GET /oauth/session-status
 * Permite a la app móvil verificar si el usuario ya aprobó el consentimiento en el navegador del sistema
 * cuando el fabricante del teléfono (ej. Vivo Funtouch OS) o Firefox bloquea el intent exp:// de Expo Go.
 */
export function sessionStatusController(req: Request, res: Response) {
  const { state } = req.query;
  if (!state || typeof state !== 'string') {
    return res.status(400).json({ approved: false, error: 'missing_state' });
  }

  const record = getApprovedAuthCodeByState(state);
  if (!record) {
    return res.status(200).json({ approved: false });
  }

  const { targetDeepLink } = buildDeepLinks(record.redirectUri, record.code, record.state);
  return res.status(200).json({
    approved: true,
    code: record.code,
    state: record.state,
    callbackUrl: targetDeepLink,
  });
}

/**
 * POST /oauth/authorize (Para pruebas automatizadas y clientes HTTP directos)
 */
export function authorizePostController(req: Request, res: Response) {
  const {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  } = req.body;

  if (!client_id || !redirect_uri || !code_challenge || !state) {
    return res.status(400).send('Parámetros de autorización incompletos.');
  }

  const code = createAuthorizationCode({
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method || 'S256',
    state,
    approved: true,
  });

  const { targetDeepLink } = buildDeepLinks(redirect_uri, code, state);
  return res.redirect(302, targetDeepLink);
}

/**
 * POST /oauth/token
 * Token Exchange: Valida code_verifier contra code_challenge (PKCE) y entrega tokens.
 */
export function tokenController(req: Request, res: Response) {
  try {
    const {
      grant_type,
      code,
      code_verifier,
      client_id,
      redirect_uri,
    } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        message: 'grant_type debe ser "authorization_code".',
      });
    }

    if (!code || !code_verifier || !client_id) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Faltan parámetros obligatorios: code, code_verifier o client_id.',
      });
    }

    const tokenResponse = exchangeCodeForTokens({
      code,
      codeVerifier: code_verifier,
      clientId: client_id,
      redirectUri: redirect_uri || 'unisabana-auth://callback',
    });

    console.log(`[OAUTH SERVER] 🎟️ Token Exchange PKCE exitoso para ${tokenResponse.user.email}`);
    return res.status(200).json(tokenResponse);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.error || 'server_error',
      message: err.message || 'Error durante el intercambio de tokens.',
    });
  }
}
