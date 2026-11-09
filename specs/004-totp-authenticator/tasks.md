# TAREAS DE IMPLEMENTACIÓN: MÓDULO AUTHENTICATOR PROPIO — TOTP EN MODO AVIÓN
**Código:** TASKS-004 | **Plan:** PLAN-004 | **Estado:** En Progreso

---

## 1. LISTA DE TAREAS SECUENCIALES

- [x] **Tarea 4.1: Decodificador Base32 Puro (RFC 4648) y Parser de URI `otpauth://`**
  - **Descripción:** Implementar `mobile-app/src/crypto/base32.ts` con decodificación bit a bit (grupos de 5 bits a bytes de 8 bits) y extracción automática del parámetro `secret=` cuando se pegue o escanee una URI `otpauth://totp/...`.
  - **Verificación:** Decodificación exacta de semillas estándar como `JBSWY3DPEHPK3PXP`.

- [x] **Tarea 4.2: Motor Matemático TOTP desde Cero (RFC 6238 / RFC 4226)**
  - **Descripción:** Implementar `mobile-app/src/crypto/totp.ts` con:
    1. Empaquetado Big-Endian de 64 bits (`8 bytes`) para $T = \lfloor \text{UnixTimestamp} / 30 \rfloor$.
    2. Cálculo de `HMAC-SHA1(secretBytes, timeBuffer)`.
    3. Truncamiento Dinámico (`offset = H[19] & 0x0F`, máscara `0x7FFFFFFF`, módulo $10^6$ y `padStart(6, '0')`).
  - **Verificación:** Cero librerías de TOTP de alto nivel, ejecución 100% sincrónica y offline.

- [x] **Tarea 4.3: Interfaz Reactiva de `TotpScreen.tsx` con Temporizador de 30s (Modo Avión)**
  - **Descripción:** Conectar `generateTOTP` y `extractBase32Secret` en `mobile-app/src/screens/TotpScreen.tsx`, con actualización reactiva cada segundo, barra de progreso visual, validación de semilla y paridad con Google Authenticator.
  - **Verificación:** Funcionamiento sin red (Modo Avión) y paridad visual con Google Authenticator.

- [x] **Tarea 4.4: Validador TOTP en Backend y Batería de Pruebas RFC 6238**
  - **Descripción:**
    - Implementar `backend-auth/src/services/totpValidator.ts` con la misma matemática RFC 6238 y validación en ventanas $C-1, C, C+1$.
    - Crear `backend-auth/src/tests/totp.test.ts` verificando los vectores oficiales del RFC 6238 y paridad de semillas Base32.
  - **Verificación:** `npx tsc --noEmit` sin errores y pruebas unitarias superadas.

