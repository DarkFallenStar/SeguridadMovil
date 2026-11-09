# TAREAS DE IMPLEMENTACIÓN: OAUTH 2.0 CON PKCE & DEEP LINKING
**Código:** TASKS-002 | **Plan:** PLAN-002 | **Estado:** En Progreso

---

## 1. LISTA DE TAREAS SECUENCIALES

- [ ] **Tarea 2.1: Dependencias e Integración en `mobile-app`**
  - **Descripción:** Instalar `expo-web-browser`, `expo-crypto` y `expo-linking` usando `npx expo install`. Configurar `"scheme": "unisabana-auth"` en `app.json`.
  - **Verificación:** `mobile-app/app.json` tiene el scheme y las dependencias están en `package.json`.
  - **Dependencia:** Ninguna.

- [ ] **Tarea 2.2: Generador Criptográfico PKCE (`mobile-app/src/crypto/pkce.ts`)**
  - **Descripción:** Implementar generación de `code_verifier` (64 caracteres URL-safe), `generateRandomState()` y `generateCodeChallenge()` (SHA-256 + Base64URL sin padding).
  - **Verificación:** Pruebas unitarias de hashing y formato Base64URL sin signos `=` ni `+` ni `/`.
  - **Dependencia:** Tarea 2.1.

- [ ] **Tarea 2.3: Backend OAuth Server (`backend-auth`)**
  - **Descripción:** Implementar `src/services/oauthService.ts`, `src/controllers/oauthController.ts` y `src/routes/oauthRoutes.ts` con:
    - `GET /oauth/authorize`: Genera authorization code y redirige por deep link.
    - `POST /oauth/token`: Valida `SHA256(code_verifier) === code_challenge` y emite tokens JWT con TTL de 300s (access) y 30 días (refresh).
  - **Verificación:** Probar endpoints con curl / script de prueba.
  - **Dependencia:** Ninguna.

- [ ] **Tarea 2.4: Servicio de Autenticación y Manejo de Callback en `mobile-app`**
  - **Descripción:** Implementar `src/services/authService.ts` que integra `WebBrowser.openAuthSessionAsync`, captura el callback `unisabana-auth://callback`, valida el parámetro `state` anti-CSRF e intercambia el código por tokens con `POST /oauth/token`.
  - **Verificación:** Invocación limpia y manejo de errores anti-CSRF y cancelación.
  - **Dependencia:** Tareas 2.2 y 2.3.

- [ ] **Tarea 2.5: Conexión con `LoginScreen` y Navegación Reactiva**
  - **Descripción:** Conectar el botón de `LoginScreen` al flujo de `authService.loginWithOAuth()`, actualizando el estado de la sesión y navegando a `DashboardScreen` con los datos recibidos.
  - **Verificación:** Ejecutar el flujo de login completo en la app.
  - **Dependencia:** Tarea 2.4.

---

## 2. CHECKLIST DE VERIFICACIÓN FINAL
- [ ] `npx tsc --noEmit` sin errores en `mobile-app`.
- [ ] `npx tsc --noEmit` sin errores en `backend-auth`.
- [ ] Prueba PKCE exitosa: `code_challenge` verificado correctamente por el backend.
- [ ] Prueba Anti-CSRF exitosa: `state` adulterado es rechazado.
- [ ] Prueba Anti-Tampering: `code_verifier` adulterado es rechazado con `400 Bad Request`.
- [ ] Actualización de `PROJECT_STATUS.md`.
- [ ] Commit y Push a GitHub.

