# ESPECIFICACIÓN: CONFIGURACIÓN Y APROVISIONAMIENTO DEL SECRETO TOTP (QR + MANUAL + SECURESTORE)
**Código:** SPEC-005 | **Fase:** Fase 5 | **Estado:** Aprobado

---

## 1. DEFINICIÓN DEL PROBLEMA Y OBJETIVO
- **Problema:** Un autenticador TOTP móvil real no debe depender únicamente de una semilla estática en memoria volátil. Debe permitir aprovisionar el secreto compartido ($K$) mediante las dos vías exigidas por la guía de laboratorio (**Opción A: Escaneo de Código QR con `expo-camera`** y **Opción B: Ingreso manual Base32**), validar estrictamente los parámetros de la URI `otpauth://totp/`, persistir la semilla cifrada por hardware en `expo-secure-store` para sobrevivir reinicios en **Modo Avión**, y mantener sincronizado el secreto con el servidor de autenticación.
- **Objetivo:** Implementar la ingesta dual (Cámara QR + Manual), la validación estricta de `otpauth://totp/`, el almacenamiento cifrado en `SecureStore` y el endpoint de aprovisionamiento con QR visual en el backend.

---

## 2. REQUISITOS FUNCIONALES (RF)
- **RF-5.1 (Validación Estricta de URI `otpauth://totp/` y Base32):**
  - Reconocer y validar URIs con formato `otpauth://totp/<Label>?secret=<Base32>&issuer=<Issuer>&algorithm=SHA1&digits=6&period=30`.
  - Rechazar explícitamente (sin aceptar silenciosamente) configuraciones incompatibles con el taller: tipo distinto de `totp`, `algorithm` distinto de `SHA1`, `digits` distinto de `6`, `period` distinto de `30`, o caracteres fuera del alfabeto Base32 (`A-Z`, `2-7`).
- **RF-5.2 (Ingesta por Cámara QR — Opción A):**
  - Integrar `expo-camera` (`CameraView` y `useCameraPermissions`) para escanear códigos QR desde `TotpScreen.tsx`.
- **RF-5.3 (Ingesta Manual Validada — Opción B):**
  - Permitir ingresar manualmente una semilla Base32 o URI `otpauth://` y persistirla tras superar la validación.
- **RF-5.4 (Persistencia Cifrada en Hardware — `expo-secure-store`):**
  - Guardar y recuperar la semilla TOTP en el enclave seguro del dispositivo (`SecureStore`) bajo la clave `unisabana_secure_totp_seed`, garantizando disponibilidad 100% offline en Modo Avión.
- **RF-5.5 (Aprovisionamiento y Vista QR en Backend):**
  - `GET /auth/mfa/setup`: Renderizar una página HTML con el código QR oficial de la semilla activa (y devolver JSON si se solicita `?format=json`) para facilitar el escaneo simultáneo con la app móvil y Google Authenticator durante la sustentación.
  - `POST /auth/mfa/setup`: Permitir actualizar en memoria del servidor la semilla Base32 asociada al usuario de prueba cuando la app está conectada.

---

## 3. REQUISITOS NO FUNCIONALES Y DE SEGURIDAD (RNF)
- **RNF-5.1 (Tolerancia a Modo Avión):** Si el usuario cambia o lee la semilla estando en Modo Avión, el guardado local en `SecureStore` y la generación TOTP deben funcionar sin fallar aunque la sincronización opcional de red no esté disponible.
- **RNF-5.2 (Protección del Secreto):** Prohibido almacenar la semilla TOTP en `AsyncStorage` o imprimirla en logs de producción.

---

## 4. CRITERIOS DE ACEPTACIÓN
- [x] La app escanea un código QR `otpauth://totp/...` con `expo-camera` y actualiza el código de 6 dígitos inmediatamente.
- [x] Si se ingresa una URI con `algorithm=SHA256`, `digits=8` o `period=60`, el validador la rechaza con un mensaje descriptivo.
- [x] Al cerrar y reabrir la app en Modo Avión, la semilla configurada se recupera desde `SecureStore`.
- [x] El backend expone `http://localhost:3000/auth/mfa/setup` mostrando el QR escaneable para la Prueba de Aceptación #2.
