/**
 * Batería de Pruebas Criptográficas: Motor TOTP Propio (RFC 6238 y RFC 4226)
 * Verifica:
 * 1. Decodificador Base32 (RFC 4648).
 * 2. Vectores oficiales de prueba del RFC 6238 (Apéndice B) para HMAC-SHA1.
 * 3. Empaquetado Big-Endian de 64 bits y Truncamiento Dinámico.
 * 4. Tolerancia de ventanas temporales (C-1, C, C+1).
 */

import {
  base32ToBuffer,
  counterToBuffer,
  generateHOTPFromBytes,
  generateTOTP,
  verifyTOTPWithClockSkew,
  DEFAULT_TOTP_SECRET_BASE32,
} from '../services/totpValidator.js';

function runTotpTests() {
  console.log('\n🧪 INICIANDO PRUEBAS MATEMÁTICAS TOTP (RFC 6238 / RFC 4226)...\n');

  let passed = 0;
  const total = 5;

  // TEST 1: Decodificación Base32 (RFC 4648)
  // Semilla ASCII de 20 bytes del RFC 6238: "12345678901234567890"
  // En Base32 es: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
  const rfcBase32Seed = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const decodedRfcSeed = base32ToBuffer(rfcBase32Seed).toString('ascii');
  if (decodedRfcSeed === '12345678901234567890') {
    console.log('✅ TEST 1: Decodificador Base32 (RFC 4648) exacto SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 1 FALLÓ:', decodedRfcSeed);
  }

  // TEST 2: Empaquetado Big-Endian de 64 bits (8 bytes)
  const bufCounter1 = counterToBuffer(1);
  if (bufCounter1.toString('hex') === '0000000000000001' && bufCounter1.length === 8) {
    console.log('✅ TEST 2: Empaquetado Big-Endian de 64 bits (8 bytes) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 2 FALLÓ:', bufCounter1.toString('hex'));
  }

  // TEST 3: Vectores Oficiales del RFC 6238 (Apéndice B - SHA1)
  // Nota: RFC 6238 Apéndice B muestra 8 dígitos; los últimos 6 dígitos corresponden al módulo 10^6 de Google Authenticator.
  const rfcSecretBytes = Buffer.from('12345678901234567890', 'ascii');
  const rfcVectors = [
    { timeSec: 59, expected8: '94287082', expected6: '287082' },
    { timeSec: 1111111109, expected8: '07081804', expected6: '081804' },
    { timeSec: 1111111111, expected8: '14050471', expected6: '050471' },
    { timeSec: 1234567890, expected8: '89005924', expected6: '005924' },
    { timeSec: 2000000000, expected8: '69279037', expected6: '279037' },
  ];

  const allVectorsMatch = rfcVectors.every((v) => {
    const counter = Math.floor(v.timeSec / 30);
    const code8 = generateHOTPFromBytes(rfcSecretBytes, counter, 8);
    const code6 = generateTOTP(rfcBase32Seed, v.timeSec * 1000, 30);
    return code8 === v.expected8 && code6 === v.expected6;
  });

  if (allVectorsMatch) {
    console.log('✅ TEST 3: 100% de paridad con los vectores oficiales del RFC 6238 (Apéndice B) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 3 FALLÓ en vectores RFC 6238.');
  }

  // TEST 4: Validación en ventana actual (C) y adyacentes (C-1, C+1) por Clock Skew
  const fixedTimeMs = 1_700_000_000_000;
  const codeAtPrevWindow = generateTOTP(DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs - 30_000);
  const codeAtCurrentWindow = generateTOTP(DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs);
  const codeAtNextWindow = generateTOTP(DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs + 30_000);

  const checkPrev = verifyTOTPWithClockSkew(codeAtPrevWindow, DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs);
  const checkCurr = verifyTOTPWithClockSkew(codeAtCurrentWindow, DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs);
  const checkNext = verifyTOTPWithClockSkew(codeAtNextWindow, DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs);

  if (
    checkPrev.valid && checkPrev.windowOffset === -1 &&
    checkCurr.valid && checkCurr.windowOffset === 0 &&
    checkNext.valid && checkNext.windowOffset === 1
  ) {
    console.log('✅ TEST 4: Tolerancia a desfase de reloj (Clock Skew C-1, C, C+1) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 4 FALLÓ:', { checkPrev, checkCurr, checkNext });
  }

  // TEST 5: Rechazo de códigos fuera de la ventana (ej. C-2)
  const codeOutsideWindow = generateTOTP(DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs - 60_000);
  const checkOutside = verifyTOTPWithClockSkew(codeOutsideWindow, DEFAULT_TOTP_SECRET_BASE32, fixedTimeMs);
  if (!checkOutside.valid) {
    console.log('✅ TEST 5: Rechazo de código expirado fuera de ventana (C-2) SUPERADO.');
    passed++;
  } else {
    console.error('❌ TEST 5 FALLÓ.');
  }

  console.log(`\n🎉 RESULTADO FINAL: ${passed}/${total} PRUEBAS CRIPTOGRÁFICAS TOTP SUPERADAS.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTotpTests();

