/**
 * Batería de Pruebas Automatizadas de Seguridad: Almacenamiento Seguro & Silent Refresh Queue (Punto 2)
 * Valida:
 * 1. Acceso a recurso protegido con access_token válido (200 OK).
 * 2. Rechazo con 401 Unauthorized cuando el access_token expira.
 * 3. Silent Refresh Queue: 5 peticiones simultáneas con token vencido disparan
 *    exactamente 1 sola petición POST /auth/refresh y todas completan con 200 OK.
 * 4. Revocación de refresh_token en logout y rechazo de renovación subsiguiente.
 */

import { startServer } from '../server.js';
import { signJwt } from '../services/jwtService.js';
import { refreshTokensStore, DEFAULT_USER } from '../services/oauthService.js';
import { refreshRequestsCount, resetRefreshCount } from '../routes/authRoutes.js';
import { resetProtectedCallsCount } from '../routes/apiRoutes.js';
import crypto from 'node:crypto';

async function runSilentRefreshSecurityTests() {
  console.log('\n🧪 INICIANDO PRUEBAS DE SEGURIDAD: SILENT REFRESH QUEUE & RECURSOS PROTEGIDOS...\n');

  const TEST_PORT = 3006;
  const testServer = startServer(TEST_PORT);
  await new Promise((resolve) => setTimeout(resolve, 500));

  let passedTests = 0;
  const totalTests = 5;

  try {
    resetRefreshCount();
    resetProtectedCallsCount();

    // Crear un par de tokens legítimos en el backend
    const validRefreshToken = 'rt_test_' + crypto.randomBytes(24).toString('base64url');
    refreshTokensStore.set(validRefreshToken, {
      refreshToken: validRefreshToken,
      userId: DEFAULT_USER.id,
      email: DEFAULT_USER.email,
      clientId: 'unisabana-mobile-client',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
      revoked: false,
    });

    const validAccessToken = signJwt(
      {
        userId: DEFAULT_USER.id,
        email: DEFAULT_USER.email,
        tokenType: 'access',
        mfa_verified: false,
      },
      300 // 5 minutos
    );

    // TEST 1: Acceso normal a recurso protegido GET /api/test-protected con token válido
    const normalRes = await fetch(`http://localhost:${TEST_PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${validAccessToken}` },
    });
    const normalData = (await normalRes.json()) as any;

    if (normalRes.status === 200 && normalData.status === 'success') {
      console.log('✅ TEST 1: GET /api/test-protected con access_token válido responde 200 OK SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 1 FALLÓ:', normalRes.status, normalData);
    }

    // TEST 2: Acceso con token expirado responde 401 Unauthorized
    const expiredAccessToken = signJwt(
      {
        userId: DEFAULT_USER.id,
        email: DEFAULT_USER.email,
        tokenType: 'access',
        mfa_verified: false,
      },
      -10 // Expiró hace 10 segundos
    );

    const expiredRes = await fetch(`http://localhost:${TEST_PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${expiredAccessToken}` },
    });
    const expiredData = (await expiredRes.json()) as any;

    if (expiredRes.status === 401 && expiredData.error === 'token_expired') {
      console.log('✅ TEST 2: Token expirado rechazado con HTTP 401 token_expired para activar Silent Refresh SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 2 FALLÓ:', expiredRes.status, expiredData);
    }

    // TEST 3: Renovación exitosa POST /auth/refresh con refresh_token
    const refreshRes = await fetch(`http://localhost:${TEST_PORT}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: validRefreshToken }),
    });
    const refreshData = (await refreshRes.json()) as any;

    if (
      refreshRes.status === 200 &&
      refreshData.access_token &&
      refreshData.expires_in === 300 // 5 minutos de vida útil
    ) {
      console.log('✅ TEST 3: POST /auth/refresh emite nuevo access_token con TTL de 300s (5 min) SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 3 FALLÓ:', refreshRes.status, refreshData);
    }

    // TEST 4: PRUEBA DE CONCURRENCIA (SILENT REFRESH QUEUE / ANTI-RACE CONDITION)
    // Simulamos la lógica del interceptor de red ante 5 peticiones simultáneas con token vencido
    console.log('\n⚡ Ejecutando simulación de 5 peticiones paralelas con token vencido...');
    resetRefreshCount();

    // Mock del interceptor con cola de promesas
    let isRefreshing = false;
    let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

    async function simulatedApiClient(url: string, token: string): Promise<{ status: number; data: any }> {
      let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (res.status === 401) {
        if (isRefreshing) {
          // Encolar
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(async (newTok) => {
            const retryRes = await fetch(url, { headers: { Authorization: `Bearer ${newTok}` } });
            return { status: retryRes.status, data: await retryRes.json() };
          });
        }

        // Líder de renovación
        isRefreshing = true;
        const refRes = await fetch(`http://localhost:${TEST_PORT}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: validRefreshToken }),
        });
        const refJson = (await refRes.json()) as any;
        const newToken = refJson.access_token;

        // Desbloquear cola
        failedQueue.forEach((p) => p.resolve(newToken));
        failedQueue = [];
        isRefreshing = false;

        // Reintentar la líder
        const leaderRetry = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
        return { status: leaderRetry.status, data: await leaderRetry.json() };
      }

      return { status: res.status, data: await res.json() };
    }

    // Disparar 5 peticiones en paralelo con el token expirado
    const concurrentResults = await Promise.all([
      simulatedApiClient(`http://localhost:${TEST_PORT}/api/test-protected`, expiredAccessToken),
      simulatedApiClient(`http://localhost:${TEST_PORT}/api/test-protected`, expiredAccessToken),
      simulatedApiClient(`http://localhost:${TEST_PORT}/api/test-protected`, expiredAccessToken),
      simulatedApiClient(`http://localhost:${TEST_PORT}/api/test-protected`, expiredAccessToken),
      simulatedApiClient(`http://localhost:${TEST_PORT}/api/test-protected`, expiredAccessToken),
    ]);

    const allSuccessful = concurrentResults.every((r) => r.status === 200);
    const exactlyOneRefresh = refreshRequestsCount === 1;

    if (allSuccessful && exactlyOneRefresh) {
      console.log(`✅ TEST 4: Silent Refresh Queue superada con 5 peticiones simultáneas. Refrescos ejecutados: ${refreshRequestsCount} (Exactamente 1). Todas respondieron 200 OK.`);
      passedTests++;
    } else {
      console.error('❌ TEST 4 FALLÓ. Refrescos:', refreshRequestsCount, 'Resultados:', concurrentResults);
    }

    // TEST 5: Revocación de refresh_token en Logout
    await fetch(`http://localhost:${TEST_PORT}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: validRefreshToken }),
    });

    const rejectedRefreshRes = await fetch(`http://localhost:${TEST_PORT}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: validRefreshToken }),
    });
    const rejectedData = (await rejectedRefreshRes.json()) as any;

    if (rejectedRefreshRes.status === 401 && rejectedData.error === 'refresh_token_revoked') {
      console.log('✅ TEST 5: Refresh token revocado rechazado exitosamente con HTTP 401 refresh_token_revoked SUPERADO.');
      passedTests++;
    } else {
      console.error('❌ TEST 5 FALLÓ:', rejectedRefreshRes.status, rejectedData);
    }

    console.log(`\n🎉 RESULTADO FINAL: ${passedTests}/${totalTests} PRUEBAS DE SILENT REFRESH Y ALMACENAMIENTO SUPERADAS SATISFACTORIAMENTE.\n`);
  } finally {
    testServer.close();
  }
}

runSilentRefreshSecurityTests().catch((err) => {
  console.error('Error fatal durante pruebas:', err);
  process.exit(1);
});
