# ESPECIFICACIÓN: MÓDULO AUTHENTICATOR PROPIO — TOTP EN MODO AVIÓN (RFC 6238)
**Código:** SPEC-004 | **Fase:** Fase 4 | **Estado:** Aprobado

---

## 1. DEFINICIÓN DEL PROBLEMA Y OBJETIVO
- **Problema:** En arquitecturas de autenticación móvil de alta seguridad (banca, defensa, infraestructura crítica), el segundo factor de autenticación (2FA) no debe depender de SMS vulnerables a SIM Swapping ni de librerías "caja negra" que puedan contener puertas traseras o requerir conectividad de red. El usuario debe poder generar códigos de un solo uso basados en tiempo (TOTP) incluso en entornos completamente aislados o sin cobertura celular (**Modo Avión**).
- **Objetivo:** Construir desde sus fundamentos matemáticos el algoritmo TOTP conforme al **RFC 6238** y **RFC 4226** (HOTP base) sin librerías de alto nivel (prohibido `otplib`, `speakeasy`), logrando **100% de paridad con Google Authenticator** ante la misma semilla Base32 y demostrando funcionamiento offline garantizado.

---

## 2. REQUISITOS DEL TALLER (TRACEABILITY)
- **Punto 3 de la Guía de Laboratorio:**
  - **Regla Inviolable:** Prohibido el uso de librerías de alto nivel de TOTP (`otplib`, `speakeasy`, etc.). Se permite utilizar primitivas criptográficas de hashing de bajo nivel (`HMAC-SHA1`) y decodificadores de Base32.
  - **Cálculo de la Ventana Temporal ($T$):**
    $$T = \lfloor \text{UnixTimestamp} / 30 \rfloor$$
    El valor $T$ debe formatearse como un entero de 64 bits en formato **Big-Endian** (buffer de exactamente 8 bytes).
  - **Hash Criptográfico:**
    $$H = \text{HMAC-SHA1}(\text{ClaveSecretaEnBytes}, T)$$
  - **Dynamic Truncation (Truncamiento Dinámico):**
    - Leer el último byte de $H$: $\text{offset} = H[19] \& 0x0F$.
    - Extraer 4 bytes consecutivos a partir de $\text{offset}$:
      $$\text{bin\_code} = ((H[\text{offset}] \& 0x7F) \ll 24) \mid ((H[\text{offset}+1] \& 0xFF) \ll 16) \mid ((H[\text{offset}+2] \& 0xFF) \ll 8) \mid (H[\text{offset}+3] \& 0xFF)$$
    - Obtener los 6 dígitos mediante módulo $10^6$:
      $$\text{TOTP} = \text{bin\_code} \pmod{1000000}$$
      Formatear siempre con ceros a la izquierda para garantizar 6 cifras (ej. `054231`).
  - **Experiencia de Usuario (UI/UX Móvil):**
    - Tipografía monoespaciada grande para el código de 6 dígitos.
    - Temporizador gráfico regresivo de 30 a 0 segundos con refresco reactivo automático.
    - Campo manual para ingresar la semilla Base32.
    - Funcionamiento 100% offline garantizado (**Modo Avión**).
- **Rúbrica de evaluación (25% de la nota final):**
  - Calcula TOTP desde cero (HMAC-SHA1 + Truncamiento Dinámico) sin librerías externas de TOTP. Funciona en Modo Avión y tiene 100% paridad con Google Authenticator.

---

## 3. REQUISITOS FUNCIONALES (RF)
- **RF-4.1 (Decodificador Base32 RFC 4648):**
  - Función pura `base32ToBytes(base32String)` que limpie espacios y guiones, valide el alfabeto `A-Z` y `2-7`, ignore padding `=` y convierta los grupos de 5 bits a bytes (`Uint8Array`).
- **RF-4.2 (Empaquetador de Contador Big-Endian de 64 bits):**
  - Función `timeCounterToBuffer(timestampSeconds, stepSeconds = 30)` que calcule $T = \lfloor \text{timestamp} / 30 \rfloor$ y escriba sus 8 bytes en formato Big-Endian en un `Uint8Array(8)`.
- **RF-4.3 (Motor TOTP RFC 6238):**
  - Función `generateTOTP(secretBase32, timestampMs = Date.now())`:
    1. Decodificar la semilla Base32 a bytes.
    2. Calcular el buffer Big-Endian de 8 bytes de $T$.
    3. Ejecutar `HMAC-SHA1(secretBytes, timeBuffer)`.
    4. Aplicar Dynamic Truncation sobre los 20 bytes del digest SHA-1.
    5. Aplicar módulo $10^6$ y formatear con `padStart(6, '0')`.
- **RF-4.4 (Temporizador y UI Reactiva):**
  - Hook o componente en `TotpScreen.tsx` que sincronice el refresco cada segundo, calcule los segundos restantes $30 - (\text{now} \pmod{30})$ y actualice el código de forma automática y fluida sin parpadeos visuales al llegar a 0.
- **RF-4.5 (Persistencia Local de la Semilla):**
  - Permitir al usuario cambiar la semilla Base32 y guardarla localmente para pruebas offline.

---

## 4. REQUISITOS NO FUNCIONALES Y DE SEGURIDAD (RNF)
- **RNF-4.1 (Cero Dependencia de Red):** La función de cálculo debe ser sincrónica, pura y ejecutarse enteramente en el hilo local de JavaScript sin realizar ninguna llamada HTTP o socket de red.
- **RNF-4.2 (Operaciones con Enteros Seguros):** Uso cuidadoso de operaciones binarias en JavaScript para evitar problemas de signo de 32 bits (`>>> 0`).
- **RNF-4.3 (Vectores de Prueba Oficiales):** Validación obligatoria contra los vectores de prueba de la especificación RFC 6238 (Apéndice B).

---

## 5. CRITERIOS DE ACEPTACIÓN
- [ ] La app calcula el código TOTP sin librerías externas de alto nivel.
- [ ] Con la semilla `JBSWY3DPEHPK3PXP`, la app muestra exactamente el mismo código de 6 dígitos que la app oficial de Google Authenticator al mismo segundo.
- [ ] Al activar el Modo Avión en el teléfono, el reloj llega a 0 y el código se refresca matemáticamente sin errores ni peticiones de red.
- [ ] Se superan las pruebas unitarias con los vectores oficiales de RFC 6238.

