# ESPECIFICACIÓN: ALMACENAMIENTO SEGURO Y SILENT REFRESH QUEUE
**Código:** SPEC-003 | **Fase:** Fase 3 | **Estado:** Aprobado

---

## 1. DEFINICIÓN DEL PROBLEMA Y OBJETIVO
- **Problema:** En aplicaciones móviles, persistir tokens de acceso o de refresco en almacenamientos sin cifrar (`AsyncStorage`, `localStorage` o `SharedPreferences` en plano) expone las credenciales a extracción mediante respaldos no cifrados, malware o acceso físico al dispositivo. Además, cuando un `access_token` expira (5 minutos), si múltiples llamadas a la API fallan concurrentemente con `401 Unauthorized`, lanzar renovaciones desordenadas provoca condiciones de carrera, saturación del servidor y potenciales invalidaciones accidentales de sesión.
- **Objetivo:** Implementar la estrategia de separación de memoria exigida por el taller (`access_token` volátil en RAM, `refresh_token` cifrado en hardware con `expo-secure-store`) junto con un cliente HTTP interceptor dotado de una **cola de renovación silenciosa (Silent Refresh Queue)** que pause peticiones concurrentes ante un 401, ejecute una única llamada a `POST /auth/refresh`, actualice la memoria y reintente las solicitudes transparentemente sin desorientar al usuario.

---

## 2. REQUISITOS DEL TALLER (TRACEABILITY)
- **Punto 2 de la Guía de Laboratorio:**
  - `access_token`: Vive únicamente en memoria volátil de la app (React State / Context). Vida útil: 5 minutos.
  - `refresh_token`: Se persiste en el enclave seguro nativo (`expo-secure-store`: iOS Keychain / Android Keystore). Vida útil: 30 días.
  - Interceptor HTTP con cola silenciosa (Silent Refresh Queue):
    - Detección de código `401 Unauthorized`.
    - Pausar llamadas subsecuentes y encolar peticiones en vuelo.
    - Disparar una **única** petición de renovación: `POST /auth/refresh`.
    - Al renovar, actualizar el `access_token` en memoria, reintentar peticiones pendientes y desbloquear la cola.
    - Si el `refresh_token` está vencido o revocado, limpiar el almacenamiento seguro y navegar a Login.
- **Rúbrica de evaluación (20%):**
  - Manejo de 401 con cola de promesas sin cerrar sesión abruptamente ni desorientar al usuario. Prohibido `AsyncStorage`.

---

## 3. REQUISITOS FUNCIONALES (RF)
- **RF-3.1 (Servicio de Almacenamiento Seguro - `secureStorageService.ts`):**
  - Envoltura tipada sobre `expo-secure-store` para guardar, recuperar y eliminar el `refresh_token` cifrado en el hardware del dispositivo.
  - Verificación de disponibilidad de hardware seguro (`SecureStore.isAvailableAsync()`).
  - Prohibición total de almacenar `access_token` en disco.
- **RF-3.2 (Cliente HTTP con Interceptores y Cola Silenciosa - `apiClient.ts`):**
  - Adjuntar automáticamente el `Authorization: Bearer <access_token>` desde la memoria RAM.
  - Interceptar respuestas: Si el código es `401 Unauthorized`:
    - Si ya hay una renovación en curso (`isRefreshing === true`), encolar la promesa del reintento (`failedQueue`).
    - Si no hay renovación en curso, activar bandera `isRefreshing = true` y ejecutar `POST /auth/refresh`.
    - Tras respuesta exitosa de renovación, actualizar el `access_token` en el estado en memoria y procesar todas las promesas de la cola con el nuevo token.
    - Si la renovación falla (401/403): rechazar toda la cola, limpiar `expo-secure-store`, resetear el estado y emitir evento de cierre de sesión.
- **RF-3.3 (Endpoints Backend - `POST /auth/refresh` y `POST /auth/logout`):**
  - `POST /auth/refresh`: Recibe `{ refresh_token }`. Valida que exista en base de datos/almacén, no esté revocado y no haya expirado. Emite un nuevo `access_token` (300 segundos) y devuelve `{ access_token, expires_in: 300 }`.
  - `POST /auth/logout`: Recibe `{ refresh_token }`. Marca el token como revocado.
  - `GET /api/test-protected`: Endpoint ligero de prueba que exige `access_token` válido para simular peticiones normales y forzar respuestas 401 para verificar la cola.

---

## 4. REQUISITOS NO FUNCIONALES Y DE SEGURIDAD (RNF)
- **RNF-3.1 (Aislamiento Criptográfico de Hardware):** En iOS se utiliza el Keychain Services (`kSecClassGenericPassword`), en Android se utiliza EncryptedSharedPreferences respaldado por Android Keystore.
- **RNF-3.2 (Atomicidad y Prevención de Condiciones de Carrera):** Garantizar que ante $N$ peticiones paralelas con token expirado, solo se envíe 1 única solicitud de red a `POST /auth/refresh`.
- **RNF-3.3 (Destrucción Segura en Cierre de Sesión):** Al desloguearse, borrar la clave de `SecureStore` y vaciar variables en RAM.

---

## 5. CRITERIOS DE ACEPTACIÓN
- [ ] El `refresh_token` se guarda y recupera exclusivamente desde `expo-secure-store`.
- [ ] El `access_token` nunca se escribe en almacenamiento persistente (se verifica que al matar el proceso se borre de RAM).
- [ ] Ante 3 peticiones HTTP concurrentes con token expirado (401), se ejecuta exactamente 1 petición de refresco y las 3 peticiones se completan exitosamente.
- [ ] Si el `refresh_token` es revocado en el backend, la app detecta la falla, limpia `SecureStore` y vuelve a `LoginScreen`.
- [ ] Pruebas automatizadas de concurrencia y renovación exitosas.

