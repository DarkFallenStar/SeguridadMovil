# ESPECIFICACIÓN: OAUTH 2.0 CON PKCE & DEEP LINKING (RFC 7636)
**Código:** SPEC-002 | **Fase:** Fase 2 | **Estado:** Aprobado

---

## 1. DEFINICIÓN DEL PROBLEMA Y OBJETIVO
- **Problema:** Las aplicaciones móviles son clientes públicos (*Public Clients*) que no pueden almacenar de forma segura un secreto de cliente (`client_secret`). Sin el flujo PKCE (Proof Key for Code Exchange) y un navegador seguro del sistema, las aplicaciones son vulnerables a la interceptación del código de autorización por aplicaciones maliciosas en el mismo dispositivo y a ataques de intermediario (MitM) o CSRF en WebViews embebidas.
- **Objetivo:** Implementar el flujo completo de autorización OAuth 2.0 con PKCE conforme al RFC 7636 utilizando `expo-web-browser` para abrir la sesión nativa del sistema, gestionando el retorno mediante el Deep Link `unisabana-auth://callback`, validando el parámetro anti-CSRF `state` y realizando el intercambio del `authorization_code` y `code_verifier` en el backend para emitir los tokens iniciales.

---

## 2. REQUISITOS DEL TALLER (TRACEABILITY)
- **Punto 1 de la Guía:**
  - `code_verifier`: Cadena aleatoria de 43 a 128 caracteres con alta entropía (`[A-Z]`, `[a-z]`, `[0-9]`, `-`, `.`, `_`, `~`).
  - `code_challenge`: Hash SHA-256 del `code_verifier` codificado en Base64URL sin relleno (*unpadded*).
  - Navegador seguro: Uso obligatorio de `WebBrowser.openAuthSessionAsync` (prohibido `WebView` embebida).
  - Deep Linking: Configuración del esquema `unisabana-auth://callback`.
  - Anti-CSRF `state`: Generación aleatoria única en memoria y validación estricta al retornar del deep link.
  - Intercambio de tokens: Petición `POST /oauth/token` con `grant_type: authorization_code`, `code` y `code_verifier`.
  - Validación en Backend: Verificar que `SHA256(code_verifier) === code_challenge`.
  - Emisión de tokens: `access_token` (5 min) y `refresh_token` (30 días).
- **Rúbrica de evaluación (25%):**
  - Generación criptográfica válida, uso de navegador nativo, manejo de deep links y validación de `state`.

---

## 3. REQUISITOS FUNCIONALES (RF)
- **RF-2.1 (Generador PKCE en Móvil):**
  - Módulo `src/crypto/pkce.ts` capaz de:
    - Generar `code_verifier` criptográficamente seguro (usando bytes aleatorios seguros).
    - Calcular `code_challenge = Base64Url(SHA256(code_verifier))`.
    - Generar un parámetro `state` aleatorio.
- **RF-2.2 (Lanzador del Navegador Seguro):**
  - Función que construya la URL `/oauth/authorize?response_type=code&client_id=...&redirect_uri=unisabana-auth://callback&scope=openid%20profile%20vault&state=...&code_challenge=...&code_challenge_method=S256`.
  - Invocación de `WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)`.
- **RF-2.3 (Manejo de Callback y Validación de State):**
  - Extraer los parámetros `code` y `state` de la URL de retorno.
  - Comprobar que `stateRecibido === stateGuardado`. Si difieren o es nulo, abortar con error de seguridad.
- **RF-2.4 (Intercambio de Código por Tokens):**
  - Enviar `POST /oauth/token` al backend con `code` y `code_verifier`.
  - Recibir `access_token`, `refresh_token`, `expires_in: 300` e información del usuario.
- **RF-2.5 (Servidor OAuth en Backend):**
  - `GET /oauth/authorize`: Página web de inicio de sesión que simula el consentimiento y redirige a `unisabana-auth://callback?code=...&state=...`, guardando temporalmente la asociación `code -> code_challenge`.
  - `POST /oauth/token`: Endpoint que recibe `code` y `code_verifier`, calcula `SHA256(code_verifier)` y verifica que coincida con el `code_challenge` registrado. Emite los tokens JWT.

---

## 4. REQUISITOS NO FUNCIONALES Y DE SEGURIDAD (RNF)
- **RNF-2.1 (Entropía Criptográfica):** Uso de `expo-crypto` o generador de bytes aleatorios de alta entropía. Longitud de `code_verifier` fijada en 64 caracteres.
- **RNF-2.2 (Codificación Base64URL sin Padding):** Remplazar `+` por `-`, `/` por `_` y remover todos los caracteres `=`.
- **RNF-2.3 (Cero Exposición de Secretos):** No existe ningún `client_secret` en el código de la app móvil.
- **RNF-2.4 (Manejo de Cancelación):** Si el usuario cierra el navegador antes de autenticarse, la app debe atrapar el estado `dismiss`/`cancel` sin romperse.

---

## 5. CRITERIOS DE ACEPTACIÓN
- [ ] La app móvil genera `code_verifier` y `code_challenge` matemáticamente válidos.
- [ ] Al pulsar "Iniciar Sesión", se abre el navegador nativo del sistema (Custom Tabs / Safari View Controller).
- [ ] Tras autorizar, el navegador redirige a la app móvil con `unisabana-auth://callback`.
- [ ] La app valida exitosamente el parámetro `state`.
- [ ] Si se altera el `state` o el `code_verifier`, el intercambio es rechazado inmediatamente.
- [ ] El backend valida `SHA256(code_verifier) === code_challenge` y entrega `access_token` y `refresh_token`.

---

## 6. RIESGOS TÉCNICOS Y MITIGACIONES
| Riesgo | Impacto | Probabilidad | Mitigación |
| :--- | :--- | :--- | :--- |
| Dispositivo físico no reconoce el esquema `unisabana-auth://` | Alto | Media | Configurar `scheme: "unisabana-auth"` en `app.json` de Expo y usar `WebBrowser.openAuthSessionAsync` que maneja el loopback internamente. |
| Incompatibilidad de SHA-256 en runtime JS sin Node crypto | Alto | Baja | Usar `expo-crypto` (`Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier)`). |

