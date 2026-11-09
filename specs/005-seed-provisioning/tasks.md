# TAREAS DE IMPLEMENTACIÓN: CONFIGURACIÓN Y APROVISIONAMIENTO DEL SECRETO TOTP
**Código:** TASKS-005 | **Plan:** PLAN-005 | **Estado:** Completado

---

## 1. LISTA DE TAREAS SECUENCIALES

- [x] **Tarea 5.1: Instalación de `expo-camera` compatible con Expo SDK 58**
  - **Descripción:** Ejecutar `npx expo install expo-camera` dentro de `mobile-app/`.
  - **Verificación:** Paquete registrado en `mobile-app/package.json`.

- [x] **Tarea 5.2: Validación Estricta de URI `otpauth://totp/` y Base32**
  - **Descripción:** Actualizar `mobile-app/src/crypto/base32.ts` y `backend-auth/src/services/totpValidator.ts` para validar protocolo `otpauth://`, tipo `totp`, `secret` Base32, `algorithm=SHA1`, `digits=6` y `period=30`, rechazando configuraciones incompatibles.
  - **Verificación:** Pruebas unitarias de rechazo de URIs inválidas (`7/7` superadas).

- [x] **Tarea 5.3: Persistencia del Secreto TOTP en `expo-secure-store`**
  - **Descripción:** Añadir `saveTotpSeed()` y `getTotpSeed()` en `mobile-app/src/services/secureStorageService.ts`.
  - **Verificación:** La semilla persiste al cerrar y reabrir la app en Modo Avión.

- [x] **Tarea 5.4: Endpoints de Aprovisionamiento y QR Visual en Backend (`/auth/mfa/setup`)**
  - **Descripción:** Implementar `GET /auth/mfa/setup` y `POST /auth/mfa/setup` en `backend-auth/src/routes/authRoutes.ts` junto con el almacén `userTotpSecretsStore` en `totpValidator.ts`.
  - **Verificación:** Respuesta 200 OK con URI `otpauth://` y vista QR.

- [x] **Tarea 5.5: Integración de Escáner QR (`CameraView`) y Guardado Seguro en `TotpScreen.tsx`**
  - **Descripción:** Añadir modal de escaneo QR con `expo-camera`, carga inicial desde `SecureStore` y sincronización con el backend en `mobile-app/src/screens/TotpScreen.tsx`.
  - **Verificación:** `npx tsc --noEmit` sin errores en ambos proyectos y pruebas superadas.
