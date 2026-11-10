# ESPECIFICACIÓN: Fases 8 y 9 — Integración Global, Auditoría de Seguridad y Sustentación en Vivo

**ID de Especificación:** `009-audit-demonstration`  
**Fases:** 8 y 9  
**Estado:** Aprobado e Implementado  

---

## 1. Definición del Problema

Con los 4 puntos técnicos del taller implementados y verificados en un dispositivo físico Android, es necesario consolidar la trazabilidad completa entre cada requisito de la guía académica y el código fuente, documentar las instrucciones de instalación y ejecución en `README.md`, y estructurar el guion exacto de la **Demostración en Vivo de 5 Minutos** (Sección 5 de la guía).

---

## 2. Matriz de Trazabilidad Completa (Requisitos vs. Implementación)

| Punto / Criterio de Rúbrica | Requisito Técnico | Especificación SDD | Archivos Implementados | Prueba Automatizada / En Vivo | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Punto 1: OAuth 2.0 + PKCE (25%)** | `code_verifier` criptográficamente seguro (43–128 chars) + `code_challenge` SHA-256 Base64URL sin padding | `specs/002-oauth-pkce/` | `mobile-app/src/crypto/pkce.ts` | `backend-auth/src/tests/pkce.test.ts` + Prueba en Vivo #1 | **100% Cumplido** |
| **Punto 1: Navegador Nativo & Deep Link** | `expo-web-browser` (Custom Tabs / ASWebAuthenticationSession), prohibido `<WebView>`, esquema `unisabana-auth://` y validación anti-CSRF `state` | `specs/002-oauth-pkce/` | `mobile-app/src/services/authService.ts`, `backend-auth/src/controllers/oauthController.ts` | Prueba en Vivo #1 | **100% Cumplido** |
| **Punto 2: Almacenamiento Híbrido (25%)** | `access_token` (TTL 5 min) **solo en RAM**; `refresh_token` (TTL 30 días) en hardware vía `expo-secure-store` | `specs/003-token-management/` | `mobile-app/src/services/tokenMemoryStore.ts`, `mobile-app/src/services/secureStorageService.ts` | Reinicio de App + `silentRefresh.test.ts` | **100% Cumplido** |
| **Punto 2: Silent Refresh Queue** | Interceptor HTTP ante `401 Unauthorized`, cola de peticiones concurrentes (`isRefreshing` + `failedQueue`), un único `POST /auth/refresh` y logout seguro | `specs/003-token-management/` | `mobile-app/src/services/apiClient.ts`, `backend-auth/src/routes/authRoutes.ts` | `backend-auth/src/tests/silentRefresh.test.ts` + Botón ráfaga 3x en Dashboard | **100% Cumplido** |
| **Punto 3: Autenticador TOTP RFC 6238 (30%)** | Prohibido `otplib`/`speakeasy`. Decodificación Base32 (RFC 4648), ventana 30s, contador 64-bit Big-Endian, HMAC-SHA1, Dynamic Truncation (`offset = hash[19] & 0xf`, 31 bits), `modulo 10^6` con padding | `specs/004-totp-authenticator/` | `mobile-app/src/crypto/base32.ts`, `mobile-app/src/crypto/totp.ts`, `backend-auth/src/services/totpValidator.ts` | `backend-auth/src/tests/totp.test.ts` (RFC 6238 Appendix B + Paridad) | **100% Cumplido** |
| **Punto 3: Ingesta QR / Manual y Modo Avión** | Escáner QR (`expo-camera`) + entrada manual Base32/`otpauth://`, persistencia en `SecureStore`, anillo visual regresivo 30s y operación 100% en Modo Avión | `specs/005-seed-provisioning/` | `mobile-app/src/screens/TotpScreen.tsx`, `backend-auth/src/routes/authRoutes.ts` (`/auth/mfa/setup`) | Pruebas en Vivo #2 (Google Authenticator) y #3 (Modo Avión) | **100% Cumplido** |
| **Punto 4: Step-Up Auth (20%)** | `GET /api/boveda-critica` rechaza token normal con `403 Forbidden` (`mfa_required` + `step_up_token`). `POST /auth/mfa/verify` valida ventanas $C-1, C, C+1$ y emite `elevated_token` (`mfa_verified: true`, TTL 10 min) | `specs/007-step-up-anti-replay/` | `backend-auth/src/routes/apiRoutes.ts`, `backend-auth/src/routes/authRoutes.ts`, `mobile-app/src/screens/VaultScreen.tsx` | `backend-auth/src/tests/stepUpAntiReplay.test.ts` + Prueba en Vivo #4 | **100% Cumplido** |
| **Punto 4: Caché Anti-Replay** | Registro en memoria (`Map`) con TTL de 90 segundos (3 ventanas de 30s). Reuso de código retorna `409 Conflict: Replay Attack Detected` | `specs/007-step-up-anti-replay/` | `backend-auth/src/services/antiReplayService.ts`, `mobile-app/src/screens/VaultScreen.tsx` | `backend-auth/src/tests/stepUpAntiReplay.test.ts` + Prueba en Vivo #5 | **100% Cumplido** |

---

## 3. Criterios de Aceptación de las 5 Pruebas en Vivo (5 Minutos)

1. **Escenario 1 (Minuto 1 — Login OAuth + PKCE):** Tocar "Iniciar Sesión con OAuth 2.0 + PKCE" abre Chrome Custom Tabs (`expo-web-browser`), muestra el `code_challenge` SHA-256 y al autorizar regresa automáticamente a la app e intercambia el código con el `code_verifier`.
2. **Escenario 2 (Minuto 2 — Paridad con Google Authenticator):** Escanear el mismo QR (`http://<IP>:3000/auth/mfa/setup`) o usar la semilla `JBSWY3DPEHPK3PXP` en Google Authenticator y en la pantalla "Autenticador TOTP (RFC 6238)" muestra exactamente los mismos 6 dígitos cambiando al unísono.
3. **Escenario 3 (Minuto 3 — Prueba de Fuego en Modo Avión):** Con el dispositivo en **Modo Avión** (Wi-Fi y datos apagados), el autenticador TOTP sigue generando nuevos códigos cada 30 segundos demostrando cálculo local puro (`Date.now() / 1000 / 30`).
4. **Escenario 4 (Minuto 4 — Step-Up y Acceso a Bóveda):** Desactivar Modo Avión, abrir "Bóveda Crítica", observar la intercepción `403 Forbidden (mfa_required)`, ingresar el código TOTP en el modal emergente y desbloquear los secretos de `GET /api/boveda-critica` con el `elevated_token` (`mfa_verified: true`).
5. **Escenario 5 (Minuto 5 — Ataque de Repetición / Anti-Replay):** Tocar el botón "Reenviar el MISMO código TOTP (`XXXXXX`)" antes de que pasen 90 segundos y verificar que el backend responde `409 Conflict: Replay Attack Detected`.

