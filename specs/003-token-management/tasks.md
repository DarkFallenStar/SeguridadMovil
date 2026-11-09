# TAREAS DE IMPLEMENTACIÓN: ALMACENAMIENTO SEGURO Y SILENT REFRESH QUEUE
**Código:** TASKS-003 | **Plan:** PLAN-003 | **Estado:** En Progreso

---

## 1. LISTA DE TAREAS SECUENCIALES

- [ ] **Tarea 3.1: Instalación de `expo-secure-store` y Módulo Nativo**
  - **Descripción:** Ejecutar `npx expo install expo-secure-store` en `mobile-app`.
  - **Verificación:** `expo-secure-store` añadido a `package.json`.
  - **Dependencia:** Ninguna.

- [ ] **Tarea 3.2: Servicios de Almacenamiento (Separación RAM vs Hardware)**
  - **Descripción:**
    - `mobile-app/src/services/tokenMemoryStore.ts`: Variable en memoria (RAM) para `access_token` con getter y setter volátiles.
    - `mobile-app/src/services/secureStorageService.ts`: Almacenamiento cifrado en hardware de `refresh_token` con `expo-secure-store`.
  - **Verificación:** Tipado estricto y métodos asíncronos seguros.
  - **Dependencia:** Tarea 3.1.

- [ ] **Tarea 3.3: Endpoints de Renovación y Protección en Backend**
  - **Descripción:**
    - `backend-auth/src/middleware/authMiddleware.ts`: Verificador de JWT en encabezado `Authorization: Bearer <token>`. Retorna `401 Unauthorized` si expiró.
    - `backend-auth/src/routes/authRoutes.ts`: Endpoints `POST /auth/refresh` (emite nuevo access token de 300s) y `POST /auth/logout`.
    - `backend-auth/src/routes/testRoutes.ts`: `GET /api/test-protected` para probar respuestas 200 y 401.
  - **Verificación:** Pruebas de endpoints con curl y script.
  - **Dependencia:** Ninguna.

- [ ] **Tarea 3.4: Cliente HTTP Centralizado con Interceptor y Cola de Promesas (`apiClient.ts`)**
  - **Descripción:** Implementar el interceptor HTTP con cola silenciosa (`failedQueue`) para pausar llamadas simultáneas, disparar 1 solo refresco y reintentar las llamadas encoladas.
  - **Verificación:** Pruebas de concurrencia sin condiciones de carrera.
  - **Dependencia:** Tareas 3.2 y 3.3.

- [ ] **Tarea 3.5: Integración en la App Móvil y Pruebas de Sustentación**
  - **Descripción:** Actualizar `LoginScreen`, `App.tsx` y `DashboardScreen` con botones para:
    - Ver estado de memoria vs SecureStore.
    - Botón "Simular 3 Peticiones Concurrentes con Token Expirado" para demostrar el Silent Refresh en vivo.
    - Cierre de sesión seguro con revocación en backend y borrado en SecureStore.
  - **Verificación:** Demostración en emulador/dispositivo.
  - **Dependencia:** Tarea 3.4.

---

## 2. CHECKLIST DE VERIFICACIÓN FINAL
- [ ] `npx tsc --noEmit` en `mobile-app` sin errores.
- [ ] `npx tsc --noEmit` en `backend-auth` sin errores.
- [ ] Batería de pruebas de Silent Refresh Queue superada (1 solo POST /auth/refresh ante peticiones simultáneas).
- [ ] `SecureStore` borrado al desloguearse.
- [ ] Actualización de `PROJECT_STATUS.md`.
- [ ] Commit y Push a GitHub.

