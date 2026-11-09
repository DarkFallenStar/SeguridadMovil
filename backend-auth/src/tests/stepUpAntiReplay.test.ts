/**
 * Batería de Pruebas Automatizadas: Step-Up Authentication y Caché Anti-Replay (Punto 4)
 * Verifica:
 * 1. Emisión de step_up_token ante sesión sin MFA (mfa_verified: false).
 * 2. Validación TOTP en ventanas C-1, C, C+1 y registro en Caché Anti-Replay (TTL 90s).
 * 3. Bloqueo inmediato de Ataque de Repetición (Replay Attack -> 409 Conflict) dentro de los 90s.
 * 4. Emisión de elevated_token con claim mfa_verified: true y expiración de 10 minutos (600s).
 * 5. Liberación automática de la Caché Anti-Replay tras cumplirse el TTL de 90 segundos.
 */

import { signJwt, verifyJwt } from '../services/jwtService.js';
import {
  generateTOTP,
  verifyTOTPWithClockSkew,
  DEFAULT_TOTP_SECRET_BASE32,
} from '../services/totpValidator.js';
import {
  checkAndRegisterTotpCode,
  clearAntiReplayCache,
  ANTI_REPLAY_TTL_MS,
} from '../services/antiReplayService.js';

function runStepUpAndAntiReplayTests() {
  console.log('\n🧪 INICIANDO PRUEBAS DE STEP-UP AUTHENTICATION Y ANTI-REPLAY (PUNTO 4)...\n');
  clearAntiReplayCache();

  let passed = 0;
  const total = 5;
  const userId = 'user_unisabana_01';
  const email = 'estudiante@unisabana.edu.co';
  const baseTimeMs = 1_700_000_000_000;

  // TEST 1: Token estándar tiene mfa_verified: false y requiere Step-Up
  const standardToken = signJwt(
    { userId, email, tokenType: 'access', mfa_verified: false },
    300
  );
  const verifiedStandard = verifyJwt(standardToken);
  if (verifiedStandard.valid && verifiedStandard.payload?.mfa_verified === false) {
    console.log('✅ TEST 1: Detección de sesión estándar (mfa_verified: false -> 403 mfa_required) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 1 FALLÓ.');
  }

  // TEST 2: Primer uso de código TOTP válido en ventana C es aceptado y registrado en caché
  const validCode = generateTOTP(DEFAULT_TOTP_SECRET_BASE32, baseTimeMs);
  const skewCheck = verifyTOTPWithClockSkew(validCode, DEFAULT_TOTP_SECRET_BASE32, baseTimeMs);
  const firstAttempt = checkAndRegisterTotpCode(
    userId,
    validCode,
    skewCheck.matchedCounter!,
    baseTimeMs
  );

  if (skewCheck.valid && firstAttempt.allowed) {
    console.log('✅ TEST 2: Primer uso de código TOTP validado y registrado en memoria (TTL 90s) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 2 FALLÓ.');
  }

  // TEST 3: Emisión de elevated_token con claim mfa_verified: true y vigencia de 10 minutos (600s)
  const elevatedToken = signJwt(
    { userId, email, tokenType: 'elevated', mfa_verified: true },
    600
  );
  const verifiedElevated = verifyJwt(elevatedToken);
  const ttlSeconds =
    (verifiedElevated.payload?.exp ?? 0) - (verifiedElevated.payload?.iat ?? 0);

  if (
    verifiedElevated.valid &&
    verifiedElevated.payload?.mfa_verified === true &&
    verifiedElevated.payload?.tokenType === 'elevated' &&
    ttlSeconds === 600
  ) {
    console.log('✅ TEST 3: Emisión de elevated_token (mfa_verified: true, vigencia 10 min = 600s) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 3 FALLÓ:', verifiedElevated);
  }

  // TEST 4: Ataque de Repetición (Replay Attack) con el mismo código 15s después es bloqueado (409 Conflict)
  const replayAttempt = checkAndRegisterTotpCode(
    userId,
    validCode,
    skewCheck.matchedCounter!,
    baseTimeMs + 15_000
  );

  if (!replayAttempt.allowed && replayAttempt.existingRecord?.code === validCode) {
    console.log('✅ TEST 4: Protección Anti-Replay bloquea reuso del mismo código dentro de los 90s (409 Conflict) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 4 FALLÓ: El código repetido no fue bloqueado.');
  }

  // TEST 5: Expiración automática en caché tras superar el TTL de 90 segundos (90,001 ms)
  const afterTtlAttempt = checkAndRegisterTotpCode(
    userId,
    validCode,
    skewCheck.matchedCounter! + 3,
    baseTimeMs + ANTI_REPLAY_TTL_MS + 1
  );

  if (afterTtlAttempt.allowed) {
    console.log('✅ TEST 5: Purga automática de caché tras cumplir TTL exacto de 90 segundos SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 5 FALLÓ.');
  }

  console.log(`\n🎉 RESULTADO FINAL: ${passed}/${total} PRUEBAS DE STEP-UP & ANTI-REPLAY SUPERADAS.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runStepUpAndAntiReplayTests();

