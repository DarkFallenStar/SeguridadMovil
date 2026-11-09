# ESPECIFICACIÓN: STEP-UP AUTHENTICATION, BÓVEDA CRÍTICA Y CACHÉ ANTI-REPLAY (TTL 90S)
**Código:** SPEC-007 | **Fase:** Fases 6 y 7 (Punto 4 de la Guía) | **Estado:** Aprobado

---

## 1. DEFINICIÓN DEL PROBLEMA Y OBJETIVO
- **Problema:** Una sesión móvil ordinaria (`access_token` con `mfa_verified: false`) no debe tener acceso directo a recursos críticos del negocio (como una Bóveda Financiera o de Llaves Maestras). Si el servidor confiara en un booleano del cliente o no invalidara los códigos TOTP recién utilizados, un atacante que intercepte la red podría repetir el mismo código de 6 dígitos dentro de su ventana de validez (*Replay Attack*).
- **Objetivo:** Implementar el flujo completo de **Step-Up Authentication (Elevación Dinámica de Privilegios)** y el **Control Anti-Replay en Memoria (TTL 90 segundos)** tanto en `backend-auth` como en `mobile-app`.

---

## 2. REQUISITOS DEL TALLER (TRACEABILITY — PUNTO 4)
1. **Protección de Recurso Crítico (`GET /api/boveda-critica` y alias `GET /api/boveda`):**
   - Exige un JWT válido en `Authorization: Bearer <token>`.
   - Si el token tiene `mfa_verified: false`, responde **`403 Forbidden`** con:
     - `error: "mfa_required"`
     - `step_up_token`: JWT temporal de desafío (`tokenType: 'step_up'`, vigencia corta de 120 segundos).
   - Si el token tiene `mfa_verified: true`, responde **`200 OK`** entregando los datos confidenciales de la Bóveda Crítica.
2. **Verificación TOTP (`POST /auth/mfa/verify`):**
   - Recibe `{ step_up_token, code }` (o `totp_code`).
   - Verifica criptográficamente el `step_up_token`.
   - **Tolerancia a Desfase de Reloj (Clock Skew):** Valida el código TOTP de 6 dígitos en las tres ventanas temporales: $C-1$ ($t - 30\text{s}$), $C$ ($t$) y $C+1$ ($t + 30\text{s}$).
   - **Caché Anti-Replay (TTL 90s):** Registra cada código validado en un `Map` en memoria asociado a `(userId, matchedCounter, code)` con expiración exacta de **90 segundos** (`Date.now() + 90_000`).
   - Si el mismo código vuelve a enviarse antes de expirar los 90 segundos, responde inmediatamente **`409 Conflict`** con `{ error: "replay_attack_detected", message: "409 Conflict: Replay Attack Detected" }`.
3. **Sesión Elevada:**
   - Si el código es válido y no ha sido usado, emite un `elevated_token` (`tokenType: 'elevated'`, claim `mfa_verified: true`) con expiración exacta de **10 minutos (`600 segundos`)**.

---

## 3. CRITERIOS DE ACEPTACIÓN (ESCENARIOS #4 Y #5 DE LA SUSTENTACIÓN)
- [x] Al consultar `GET /api/boveda-critica` con sesión estándar (`mfa_verified: false`), el servidor responde `403 Forbidden` (`error: "mfa_required"`) y la app abre automáticamente el modal de 2FA.
- [x] Al ingresar el código TOTP de 6 dígitos en el modal, el backend lo valida en $C-1, C, C+1$, retorna el `elevated_token` (10 min), la app reemplaza el token en RAM y desbloquea la Bóveda Crítica.
- [x] Si se reenvía el mismo código TOTP recién utilizado dentro de los 90 segundos, el backend responde `409 Conflict: Replay Attack Detected`.
