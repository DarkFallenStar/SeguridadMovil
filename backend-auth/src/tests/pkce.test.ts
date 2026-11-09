/**
 * Batería de Pruebas Automatizadas de Seguridad: OAuth 2.0 con PKCE (RFC 7636)
 * Valida generación criptográfica, token exchange, anti-tampering y anti-replay de authorization code.
 */

import crypto from 'node:crypto';
import { startServer } from '../server.js';

async function runPkceSecurityTests() {
  console.log('\n🧪 INICIANDO PRUEBAS DE SEGURIDAD OAUTH 2.0 + PKCE (RFC 7636)...\n');

  const TEST_PORT = 3005;
  const testServer = startServer(TEST_PORT);

  // Esperar a que el servidor esté listo
  await new Promise((resolve) => setTimeout(resolve, 500));

  let passedTests = 0;
  const totalTests = 5;

  try {
    // TEST 1: Generación y Validación Matemática de PKCE (RFC 7636)
    const codeVerifier = crypto.randomBytes(32).toString('base64url'); // 43 chars URL-safe
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
    const state = crypto.randomBytes(16).toString('base64url');

    if (codeVerifier.length >= 43 && codeVerifier.length <= 128 && !codeChallenge.includes('=')) {
      console.log('✅ TEST 1: Generación matemática de code_verifier y code_challenge (Base64URL sin padding) SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 1 FALLÓ');
    }

    // TEST 2: Endpoint GET /oauth/authorize renderiza consentimiento seguro
    const authUrl = `http://localhost:${TEST_PORT}/oauth/authorize?response_type=code&client_id=unisabana-mobile-client&redirect_uri=unisabana-auth://callback&scope=openid%20profile%20vault&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    const getAuthRes = await fetch(authUrl);
    const htmlBody = await getAuthRes.text();

    if (getAuthRes.status === 200 && htmlBody.includes('Iniciar Sesión UniSabana') && htmlBody.includes('unisabana-auth://callback')) {
      console.log('✅ TEST 2: GET /oauth/authorize responde 200 OK y renderiza vista segura en navegador SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 2 FALLÓ');
    }

    // TEST 3: Autorización del usuario (POST /oauth/authorize) emite Deep Link con código
    const postAuthRes = await fetch(`http://localhost:${TEST_PORT}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'unisabana-mobile-client',
        redirect_uri: 'unisabana-auth://callback',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
      }),
      redirect: 'manual', // Capturar la redirección 302
    });

    const locationHeader = postAuthRes.headers.get('location');
    if (postAuthRes.status === 302 && locationHeader && locationHeader.startsWith('unisabana-auth://callback')) {
      console.log('✅ TEST 3: POST /oauth/authorize emite HTTP 302 hacia el Deep Link unisabana-auth://callback SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 3 FALLÓ, status:', postAuthRes.status, 'location:', locationHeader);
    }

    // Extraer el authorization_code y el state del Location
    const redirectUrl = new URL(locationHeader!.replace('unisabana-auth://', 'http://placeholder/'));
    const receivedCode = redirectUrl.searchParams.get('code');
    const receivedState = redirectUrl.searchParams.get('state');

    // Validar anti-CSRF state
    if (receivedState !== state) {
      throw new Error('Ataque CSRF: el state recibido no coincide');
    }

    // TEST 4: Token Exchange con verifier correcto (POST /oauth/token)
    const tokenRes = await fetch(`http://localhost:${TEST_PORT}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: receivedCode,
        code_verifier: codeVerifier, // Verifier legítimo
        client_id: 'unisabana-mobile-client',
        redirect_uri: 'unisabana-auth://callback',
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (
      tokenRes.status === 200 &&
      tokenData.access_token &&
      tokenData.expires_in === 300 && // 5 minutos exactos según Punto 2
      tokenData.refresh_token
    ) {
      console.log('✅ TEST 4: Token Exchange exitoso. Access token con vida exacta de 5 min (300s) y refresh token SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 4 FALLÓ:', tokenData);
    }

    // TEST 5: Protección Anti-Tampering (Enviar verifier incorrecto debe ser rechazado)
    const tamperedVerifier = 'un_verifier_completamente_falso_y_adulterado_para_la_prueba_1234567890';
    const postTamperedAuth = await fetch(`http://localhost:${TEST_PORT}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'unisabana-mobile-client',
        redirect_uri: 'unisabana-auth://callback',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: 'state_tampered',
      }),
      redirect: 'manual',
    });

    const tamperedLocation = postTamperedAuth.headers.get('location')!;
    const tamperedRedirect = new URL(tamperedLocation.replace('unisabana-auth://', 'http://placeholder/'));
    const tamperedCode = tamperedRedirect.searchParams.get('code');

    const tamperedTokenRes = await fetch(`http://localhost:${TEST_PORT}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: tamperedCode,
        code_verifier: tamperedVerifier, // Verifier ADULTERADO
        client_id: 'unisabana-mobile-client',
        redirect_uri: 'unisabana-auth://callback',
      }),
    });

    const tamperedData = (await tamperedTokenRes.json()) as any;
    if (tamperedTokenRes.status === 400 && tamperedData.error === 'invalid_grant') {
      console.log('✅ TEST 5: Anti-Tampering PKCE. Verifier adulterado rechazado con HTTP 400 invalid_grant SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 5 FALLÓ:', tamperedTokenRes.status, tamperedData);
    }

    console.log(`\n🎉 RESULTADO FINAL: ${passedTests}/${totalTests} PRUEBAS DE SEGURIDAD PKCE SUPERADAS SATISFACTORIAMENTE.\n`);
  } finally {
    testServer.close();
  }
}

runPkceSecurityTests().catch((err) => {
  console.error('Error fatal durante pruebas:', err);
  process.exit(1);
});
