import { Request, Response } from 'express';
import { createAuthorizationCode, exchangeCodeForTokens, DEFAULT_USER } from '../services/oauthService.js';

/**
 * GET /oauth/authorize
 * Renderiza la pantalla de consentimiento del Servidor de Autorización en el navegador del sistema.
 * Genera el authorization_code y proporciona enlaces directos compatibles con todos los navegadores
 * móviles (Chrome, Firefox, Safari, y navegadores de fabricantes como Vivo/Xiaomi).
 */
export function authorizeGetController(req: Request, res: Response) {
  const {
    client_id,
    redirect_uri,
    response_type,
    code_challenge,
    code_challenge_method,
    state,
    scope,
  } = req.query;

  console.log(`\n===================================================`);
  console.log(`[OAUTH SERVER] 📥 GET /oauth/authorize recibido:`);
  console.log(` - client_id:             ${client_id}`);
  console.log(` - redirect_uri:          ${redirect_uri}`);
  console.log(` - code_challenge (PKCE): ${code_challenge}`);
  console.log(` - state (Anti-CSRF):     ${state}`);
  console.log(`===================================================\n`);

  // Validaciones del protocolo OAuth 2.0 (RFC 6749 y RFC 7636)
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

  // Generar de antemano el authorization_code vinculado al code_challenge
  const code = createAuthorizationCode({
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: 'S256',
    state,
  });

  // Construir el Deep Link exacto de retorno
  const separator = redirect_uri.includes('?') ? '&' : '?';
  const targetDeepLink = `${redirect_uri}${separator}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

  console.log(`[OAUTH SERVER] 🔗 Deep Link generado para retorno a la App:`);
  console.log(`   ${targetDeepLink}\n`);

  // Renderizar la página segura con enlace directo <a> y auto-redirección
  // Esto elimina bloqueos de POST 302 en Chrome de Android y teléfonos Vivo/Xiaomi
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
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #64748B;
    }
    .value {
      font-family: monospace;
      font-weight: 600;
      color: #38BDF8;
      word-break: break-all;
    }
    .btn {
      display: block;
      width: 100%;
      background-color: #2563EB;
      color: #FFFFFF;
      text-decoration: none;
      border: none;
      border-radius: 10px;
      padding: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-sizing: border-box;
      transition: background 0.2s;
    }
    .btn:hover {
      background-color: #1D4ED8;
    }
    .note {
      font-size: 11px;
      color: #64748B;
      margin-top: 14px;
      line-height: 15px;
    }
  </style>
  <script>
    function triggerRedirect() {
      // Redirección directa por JavaScript
      window.location.assign("${targetDeepLink}");
    }
  </script>
</head>
<body>
  <div class="card">
    <div class="badge">Navegador Seguro • RFC 7636</div>
    <h1>Iniciar Sesión UniSabana</h1>
    <p>La aplicación móvil está solicitando acceso delegado a tu identidad mediante OAuth 2.0 y PKCE.</p>

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
        <span class="label">Método PKCE:</span>
        <span class="value">S256 (SHA-256)</span>
      </div>
    </div>

    <!-- Enlace directo <a> que el navegador procesa con interacción directa del usuario -->
    <a href="${targetDeepLink}" class="btn" id="btn-autorizar" onclick="triggerRedirect()">
      Autorizar y Regresar a la App Móvil
    </a>

    <p class="note">
      📱 Si tu teléfono (Vivo, Xiaomi, etc.) solicita confirmación, pulsa <strong>"Abrir con Expo Go"</strong> o <strong>"Permitir"</strong>.
    </p>
  </div>
</body>
</html>`;

  return res.send(html);
}

/**
 * POST /oauth/authorize (Compatibilidad con formularios)
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
  });

  const separator = redirect_uri.includes('?') ? '&' : '?';
  const targetDeepLink = `${redirect_uri}${separator}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

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

    return res.status(200).json(tokenResponse);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.error || 'server_error',
      message: err.message || 'Error durante el intercambio de tokens.',
    });
  }
}
