# Taller de Seguridad Móvil — OAuth 2.0 con PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)

**Curso:** Desarrollo Móvil (React Native)  
**Institución:** Universidad de La Sabana — Facultad de Ingeniería  
**Estudiante:** Daniel Eduardo Botía Valderrama  
**Arquitectura:** Monorepo (`/mobile-app` en React Native Expo SDK 58 + `/backend-auth` en Node.js Express & TypeScript)  
**Metodología:** Spec-Driven Development (SDD)  

---

## 1. Arquitectura General del Monorepo

El repositorio implementa una arquitectura de **Confianza Cero (Zero-Trust)** dividida en los dos entregables exigidos por la guía del taller, respaldados por especificaciones SDD:

```text
SeguridadMovil/
├── mobile-app/                          <- Cliente Móvil en React Native con Expo SDK 58
│   ├── src/
│   │   ├── config/index.ts              <- Configuración de red, endpoints y esquema Deep Link
│   │   ├── crypto/
│   │   │   ├── pkce.ts                  <- Generador CSPRNG code_verifier + SHA-256 code_challenge (RFC 7636)
│   │   │   ├── base32.ts                <- Decodificador Base32 a nivel de bits (RFC 4648) y parser otpauth://
│   │   │   └── totp.ts                  <- Motor TOTP desde cero: SHA-1 + HMAC-SHA1 + Dynamic Truncation (RFC 6238)
│   │   ├── services/
│   │   │   ├── authService.ts           <- Flujo OAuth 2.0 con expo-web-browser y validación anti-CSRF state
│   │   │   ├── tokenMemoryStore.ts      <- Almacenamiento de access_token (5 min) exclusivamente en memoria RAM
│   │   │   ├── secureStorageService.ts  <- Bóveda hardware (Keychain/Keystore) vía expo-secure-store
│   │   │   └── apiClient.ts             <- Cliente HTTP con Interceptor 401 y Cola de Renovación (Silent Refresh Queue)
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx          <- Inicio de sesión con OAuth 2.0 + PKCE en navegador seguro del sistema
│   │   │   ├── DashboardScreen.tsx      <- Monitor en vivo de RAM vs Hardware y disparador de ráfaga concurrente (3x)
│   │   │   ├── TotpScreen.tsx           <- Autenticador TOTP offline (Modo Avión), escáner QR (expo-camera) y anillo 30s
│   │   │   └── VaultScreen.tsx          <- Bóveda Crítica con modal Step-Up 2FA (403) y prueba Anti-Replay (409)
│   │   └── types/auth.ts                <- Contratos de sesión, tokens y respuestas de error
│   ├── App.tsx                          <- Enrutador de vistas y bootstrap automático de sesión vía refresh_token
│   ├── app.json                         <- Esquema Deep Link (unisabana-auth://) y permisos nativos de cámara
│   └── package.json
│
├── backend-auth/                        <- Servidor OAuth 2.0, MFA y Bóveda Protegida (Express + TypeScript)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── oauthController.ts       <- Endpoints /oauth/authorize, /oauth/approve, /oauth/session-status y /oauth/token
│   │   ├── services/
│   │   │   ├── oauthService.ts          <- Almacén OAuth/PKCE, tokens de acceso (5 min), refresh (30 días) y step-up
│   │   │   ├── totpValidator.ts         <- Validador RFC 6238 con tolerancia de desfase (Clock Skew C-1, C, C+1)
│   │   │   └── antiReplayService.ts     <- Caché Anti-Replay en memoria (Map) con TTL de 90 segundos (409 Conflict)
│   │   ├── routes/
│   │   │   ├── oauthRoutes.ts           <- Rutas del proveedor OAuth 2.0 + PKCE
│   │   │   ├── authRoutes.ts            <- /auth/refresh, /auth/logout, /auth/mfa/setup (QR) y /auth/mfa/verify
│   │   │   └── apiRoutes.ts             <- /api/profile, /api/boveda-critica y alias /api/boveda (requiere mfa_verified: true)
│   │   └── tests/                       <- Baterías de pruebas automatizadas (PKCE, Silent Refresh, TOTP, Step-Up/Anti-Replay)
│   ├── .env.example
│   └── package.json
│
├── .specify/memory/constitution.md      <- Constitución arquitectónica y reglas de seguridad del proyecto
├── specs/                               <- Especificaciones SDD por fase (001 a 009)
└── docs/development/PROJECT_STATUS.md   <- Tablero de control de fases y registro de decisiones técnicas (ADR-00 a ADR-08)
```

---

## 2. Requisitos Previos

- **Node.js:** v22 o superior (probado en Node.js v24).
- **npm:** v10+.
- **Dispositivo físico (Android o iOS)** con la aplicación **Expo Go** instalada y conectado a la misma red Wi-Fi que el computador (o emulador Android Studio).
- *(Opcional para la Prueba #2)* **Google Authenticator** instalado en el teléfono para verificar paridad exacta de códigos TOTP.

---

## 3. Instalación, Configuración de Variables de Entorno y Ejecución

### Paso 1: Configurar e Iniciar el Backend (`backend-auth`)

1. Abrir una terminal y entrar a la carpeta del backend:
   ```bash
   cd backend-auth
   npm install
   ```

2. Verificar las variables de entorno (`.env` se crea a partir de `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Variables incluidas en `.env.example`:
   - `PORT=3000`: Puerto del servidor HTTP.
   - `ACCESS_TOKEN_TTL_SECONDS=300`: Vida útil del `access_token` (5 minutos).
   - `REFRESH_TOKEN_TTL_SECONDS=2592000`: Vida útil del `refresh_token` (30 días).
   - `ELEVATED_TOKEN_TTL_SECONDS=600`: Vida útil del `elevated_token` tras Step-Up 2FA (10 minutos).
   - `ANTI_REPLAY_TTL_SECONDS=90`: Tiempo de retención de códigos TOTP usados (3 ventanas de 30s = 90s).

3. Iniciar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   - El servidor escuchará en `http://0.0.0.0:3000`.
   - Verificación rápida: abrir `http://localhost:3000/health` o la página de aprovisionamiento QR en `http://localhost:3000/auth/mfa/setup`.

---

### Paso 2: Configurar e Iniciar la Aplicación Móvil (`mobile-app`)

1. Abrir una **segunda terminal** y entrar a la carpeta móvil:
   ```bash
   cd mobile-app
   npm install
   ```

2. **Importante si usas un dispositivo físico:**
   - El archivo `mobile-app/src/config/index.ts` detecta automáticamente la IP LAN de tu computador a través de `Constants.expoConfig.hostUri` cuando corres Expo Go.
   - Si deseas fijar manualmente una URL o IP, puedes definir la variable de entorno `EXPO_PUBLIC_API_URL=http://<TU_IP_LAN>:3000` al iniciar Expo.

3. Iniciar el servidor de desarrollo de Expo:
   ```bash
   npx expo start
   ```

4. Escanear el código QR de la terminal con **Expo Go** en tu teléfono (o presionar `a` para abrir en emulador Android).

---

## 4. Ejecución de Pruebas Automatizadas

Desde la carpeta `backend-auth/`, puedes ejecutar las baterías de pruebas automatizadas que verifican cada componente criptográfico y de seguridad:

```bash
cd backend-auth

# 1. Vectores oficiales RFC 6238 (Appendix B), Base32, Clock Skew (C-1, C, C+1) y paridad TOTP (7/7 pruebas)
npm run test:totp

# 2. Flujo completo Step-Up Authentication (403 -> mfa/verify -> 200) y bloqueo Anti-Replay (409 Conflict) (5/5 pruebas)
npm run test:stepup

# 3. Verificación de tipado estricto TypeScript en ambos proyectos
npm run typecheck
cd ../mobile-app && npx tsc --noEmit
```

*(Nota: Para `npm run test:pkce` y `npm run test:refresh`, asegúrate de tener `npm run dev` corriendo en otra terminal en el puerto 3000).*

---

## 5. Guía Paso a Paso para la Sustentación en Vivo (5 Minutos)

Sigue este guion minuto a minuto frente al profesor para demostrar los **5 Escenarios de Aceptación** de la Sección 5 del taller:

### Minuto 1 — Escenario #1: Login OAuth 2.0 + PKCE en Navegador del Sistema
1. En la pantalla inicial de la app, muestra la tarjeta **"Pre-vuelo Criptográfico PKCE (RFC 7636)"** que exhibe la longitud del `code_verifier` (64 chars CSPRNG) y el `code_challenge` (SHA-256 Base64URL sin `=`).
2. Toca **"Iniciar Sesión con OAuth 2.0 + PKCE"**.
3. **Qué señalar al profesor:** Se abre el navegador seguro del sistema (**Chrome Custom Tabs** / **ASWebAuthenticationSession** vía `expo-web-browser`, nunca un `<WebView>`). La página del servidor muestra el `code_challenge` recibido.
4. Toca **"Autorizar y Volver a la App"**. El navegador se cierra automáticamente mediante Deep Linking (`unisabana-auth://oauthredirect`), la app valida el parámetro anti-CSRF `state`, intercambia el `code` junto con el `code_verifier` en `POST /oauth/token`, guarda el `access_token` **solo en RAM** y el `refresh_token` en **`expo-secure-store`**.
5. *(Bonus Punto 2 en el Dashboard)*: Toca **"Expirar Access Token en RAM"** y luego **"Disparar 3 Peticiones Simultáneas (401)"**. Muestra cómo las 3 peticiones concurrentes reciben `401`, se encolan en la **Silent Refresh Queue**, se ejecuta **1 sola llamada** a `POST /auth/refresh` y las 3 peticiones se resuelven con éxito.

### Minuto 2 — Escenario #2: Paridad Exacta con Google Authenticator
1. En el computador, abre `http://localhost:3000/auth/mfa/setup` (que muestra el QR de la semilla `JBSWY3DPEHPK3PXP`).
2. En la app móvil, entra a **"Autenticador TOTP (RFC 6238)"**, toca **"Escanear Código QR (Cámara)"** y apunta al QR de la pantalla (o usa el campo manual Base32).
3. Abre **Google Authenticator** con la misma semilla (`JBSWY3DPEHPK3PXP`).
4. **Qué señalar al profesor:** Ambos muestran exactamente el mismo código de 6 dígitos (con padding de ceros a la izquierda) y el anillo regresivo de 30 segundos rota los códigos al mismo instante.

### Minuto 3 — Escenario #3: Prueba de Fuego en Modo Avión (100% Offline)
1. Desliza el panel de control del teléfono y **activa el Modo Avión** (sin Wi-Fi ni datos móviles).
2. Espera a que el temporizador regresivo de 30 segundos llegue a `0s`.
3. **Qué señalar al profesor:** El autenticador genera el siguiente código de 6 dígitos sin conexión de red, ejecutando localmente `base32Decode` -> contador Big-Endian de 64 bits $\lfloor \text{UnixTime}/30 \rfloor$ -> `hmacSha1` -> *Dynamic Truncation* (`offset = hash[19] & 0xf`, máscara de 31 bits `& 0x7fffffff`, $\pmod{10^6}$), e sigue coincidiendo con Google Authenticator.
4. **Desactiva el Modo Avión** y vuelve a conectar el Wi-Fi antes del siguiente paso.

### Minuto 4 — Escenario #4: Step-Up Authentication y Acceso a la Bóveda Crítica
1. Copia o memoriza el código TOTP de 6 dígitos actual de la pantalla TOTP, regresa al Dashboard y entra a **"Bóveda Crítica (Step-Up 2FA)"**.
2. **Qué señalar al profesor:** Al abrir la pantalla, la app envía el `access_token` normal a `GET /api/boveda-critica`. El backend detecta que `mfa_verified` es `false`, responde **`403 Forbidden`** con `"error": "mfa_required"` y entrega un `step_up_token` temporal.
3. La app intercepta el `403` y abre automáticamente el **Modal de Elevación Step-Up 2FA**.
4. Ingresa el código TOTP de 6 dígitos y toca **"Verificar y Elevar Sesión"**.
5. **Qué señalar al profesor:** El backend valida el código en las ventanas $C-1, C, C+1$, emite un **`elevated_token`** con el claim **`mfa_verified: true`** (TTL 10 minutos), y la pantalla se desbloquea mostrando las llaves maestras y los registros clasificados de la bóveda.

### Minuto 5 — Escenario #5: Defensa contra Ataque de Repetición (`409 Conflict`)
1. En la misma pantalla de la Bóveda Crítica desbloqueada, desplázate a la tarjeta **"Prueba de Aceptación #5: Ataque de Repetición (Anti-Replay)"**.
2. Toca el botón **"Reenviar el MISMO código TOTP (`XXXXXX`)"** antes de que transcurran 90 segundos.
3. **Qué señalar al profesor:** Aunque el código sigue siendo matemáticamente válido dentro de la ventana de tiempo, el caché Anti-Replay en memoria (`Map` con TTL de 90s en `antiReplayService.ts`) detecta que la clave `${userId}:${code}` ya fue consumida y bloquea inmediatamente la petición con **`409 Conflict: Replay Attack Detected`**.

---

## 6. Matriz Resumen de Cumplimiento de la Rúbrica

| Criterio de Evaluación | Peso | Implementación en el Proyecto | Estado |
| :--- | :---: | :--- | :---: |
| **1. OAuth 2.0 + PKCE & Deep Linking** | **25%** | `pkce.ts` (CSPRNG + SHA-256 Base64URL), `authService.ts` (`expo-web-browser` + `state` anti-CSRF + `unisabana-auth://`), `oauthController.ts` | **100%** |
| **2. Almacenamiento Seguro y Silent Refresh** | **25%** | `tokenMemoryStore.ts` (`access_token` solo en RAM), `secureStorageService.ts` (`refresh_token` en Keychain/Keystore), `apiClient.ts` (Cola concurrente 401) | **100%** |
| **3. Algoritmo TOTP Propio (RFC 6238)** | **30%** | `base32.ts` + `totp.ts` (0 librerías TOTP externas, Big-Endian 64-bit, HMAC-SHA1, Dynamic Truncation, Modo Avión, Cámara QR `expo-camera` + Manual) | **100%** |
| **4. Step-Up Auth, Bóveda y Anti-Replay** | **20%** | `apiRoutes.ts` (`403 mfa_required`), `authRoutes.ts` (`POST /auth/mfa/verify` con ventanas $C-1, C, C+1$ y `mfa_verified: true`), `antiReplayService.ts` (`Map` TTL 90s -> `409 Conflict`) | **100%** |
