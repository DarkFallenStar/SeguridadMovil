# PLAN ARQUITECTÓNICO: STEP-UP AUTHENTICATION Y CACHÉ ANTI-REPLAY
**Código:** PLAN-007 | **Especificación:** SPEC-007 | **Estado:** Aprobado

---

## 1. DIAGRAMA DE SECUENCIA: STEP-UP 2FA Y BLOQUEO ANTI-REPLAY

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario Móvil
    participant App as App Móvil (VaultScreen)
    participant RAM as Token Memory Store (RAM)
    participant API as Backend (/api/boveda-critica)
    participant MFA as Backend (/auth/mfa/verify)
    participant Cache as Anti-Replay Map (TTL 90s)

    User->>App: Toca "Consultar Recurso Crítico"
    App->>API: GET /api/boveda-critica (Bearer access_token [mfa_verified: false])
    API-->>App: 403 Forbidden { error: "mfa_required", step_up_token }
    App-->>User: Abre Modal Step-Up 2FA
    User->>App: Ingresa código TOTP de 6 dígitos (o autocompleta desde motor local)
    App->>MFA: POST /auth/mfa/verify { step_up_token, code }
    Note over MFA: 1. Verifica firma de step_up_token<br/>2. Valida TOTP en ventanas C-1, C, C+1
    MFA->>Cache: checkAndRegisterTotpCode(userId, code, matchedCounter)
    Cache-->>MFA: Libre (Registra en Map con expiresAt = now + 90,000 ms)
    MFA-->>App: 200 OK { elevated_token (mfa_verified: true, 600s) }
    App->>RAM: setAccessToken(elevated_token, 600)
    App->>API: Reintenta GET /api/boveda-critica (Bearer elevated_token)
    API-->>App: 200 OK { secretData, classification: "TOP_SECRET" }

    Note over User,Cache: Escenario #5: Intento de Ataque de Repetición (Replay Attack)
    User->>App: Toca "Simular Ataque de Repetición (Reenviar mismo TOTP)"
    App->>MFA: POST /auth/mfa/verify { step_up_token, mismo_code }
    MFA->>Cache: checkAndRegisterTotpCode(userId, mismo_code, matchedCounter)
    Cache-->>MFA: ¡Colisión detectada! (expiresAt > now)
    MFA-->>App: 409 Conflict { error: "replay_attack_detected", message: "409 Conflict: Replay Attack Detected" }
```

---

## 2. COMPONENTES Y ARCHIVOS INVOLUCRADOS

### En `backend-auth`:
- `src/services/antiReplayService.ts`:
  - `Map<string, number>` en memoria con clave compuesta `${userId}:${counter}:${code}` y valor `expiresAt = Date.now() + 90_000`.
  - Purga automática de entradas vencidas y verificación atómica sincrónica.
- `src/routes/apiRoutes.ts`:
  - `GET /api/boveda-critica` y alias `GET /api/boveda`: protegidos por `requireAccessToken`. Si `!req.user.mfa_verified`, emite `step_up_token` y responde `403 Forbidden`. Si `req.user.mfa_verified === true`, devuelve `VaultData`.
- `src/routes/authRoutes.ts`:
  - `POST /auth/mfa/verify`: valida `step_up_token`, verifica TOTP en `C-1, C, C+1`, consulta `antiReplayService` (`409 Conflict` si ya fue usado) y emite `elevated_token` (`mfa_verified: true`, `expires_in: 600`).
- `src/tests/stepUpAntiReplay.test.ts`:
  - Batería de pruebas automatizadas para el Punto 4 (`403 Forbidden`, elevación `200 OK` con `mfa_verified: true`, acceso a bóveda y rechazo `409 Conflict` ante código repetido).

### En `mobile-app`:
- `src/screens/VaultScreen.tsx` y `App.tsx`:
  - Conectar con `apiFetch('/api/boveda-critica')`.
  - Capturar `403 Forbidden`, guardar `step_up_token` y abrir el modal de 2FA.
  - Permitir ingresar el código TOTP (con botón opcional de lectura rápida del TOTP local para agilidad en la sustentación de 5 minutos).
  - Actualizar el token en `tokenMemoryStore` con el `elevated_token` (10 min), notificar a `App.tsx` (`mfaVerified: true`) y cargar los datos reales de la bóveda.
  - Incluir botón demostrativo **"🛡️ Probar Ataque de Repetición (Reenviar Código Usado)"** para demostrar en vivo el `409 Conflict` (Escenario #5 de la sustentación).

