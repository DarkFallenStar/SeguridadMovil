# TAREAS DE IMPLEMENTACIÓN: STEP-UP AUTHENTICATION Y CACHÉ ANTI-REPLAY
**Código:** TASKS-007 | **Plan:** PLAN-007 | **Estado:** Completado

---

## 1. LISTA DE TAREAS SECUENCIALES

- [x] **Tarea 7.1: Servicio de Caché Anti-Replay en Memoria con TTL de 90s (`antiReplayService.ts`)**
  - **Descripción:** Implementar `checkAndRegisterTotpCode()` con `Map<string, ReplayRecord>`, purga automática de entradas expiradas y bloqueo inmediato de códigos repetidos dentro de los 90 segundos.
  - **Verificación:** Rechazo atómico del segundo intento con el mismo `(userId, code)` dentro de los 90s.

- [x] **Tarea 7.2: Endpoint Protegido `GET /api/boveda-critica` (y alias `/api/boveda`)**
  - **Descripción:** Implementar en `backend-auth/src/routes/apiRoutes.ts` la verificación del claim `mfa_verified`. Responder `403 Forbidden` (`error: "mfa_required"`, `step_up_token`) si es `false`, o `200 OK` con los secretos de la bóveda si es `true`.
  - **Verificación:** Petición con token normal recibe `403`; petición con `elevated_token` recibe `200`.

- [x] **Tarea 7.3: Endpoint `POST /auth/mfa/verify` (Clock Skew + Anti-Replay + Elevated Token)**
  - **Descripción:** Implementar en `backend-auth/src/routes/authRoutes.ts` la validación de `step_up_token`, verificación TOTP en ventanas $C-1, C, C+1$, registro en `antiReplayService` (`409 Conflict` si es repetido) y emisión de `elevated_token` (`mfa_verified: true`, 600s).
  - **Verificación:** Pruebas de elevación y repetición (`5/5` superadas).

- [x] **Tarea 7.4: Integración Real en `VaultScreen.tsx` y `App.tsx`**
  - **Descripción:** Conectar `VaultScreen.tsx` con el backend real, manejar el ciclo `403 -> Modal 2FA -> POST /auth/mfa/verify -> 200 OK` y agregar el botón de demostración de **Ataque de Repetición (`409 Conflict`)** para la sustentación.
  - **Verificación:** `npx tsc --noEmit` sin errores y pruebas superadas.
