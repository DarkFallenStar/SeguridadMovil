# CONSTITUCIÓN DEL PROYECTO: SEGURIDAD MÓVIL
**Taller Práctico: OAuth 2.0 con PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)**  
*Universidad de La Sabana — Facultad de Ingeniería*  
*Versión: 1.0.0 | Fecha: 2026-11-08*

---

## 1. PROPÓSITO Y ALCANCE

Este documento establece las leyes y principios inviolables que rigen todo el ciclo de vida del proyecto. Ninguna decisión de diseño, implementación de código o refactorización puede contradecir los artículos aquí definidos.

---

## 2. PRINCIPIOS FUNDAMENTALES (ARTÍCULOS CONSTITUCIONALES)

### Artículo 1: Cumplimiento Estricto del Taller y Cero "Cajas Negras"
1.1. Todos los requerimientos especificados en la guía de laboratorio de la Universidad de La Sabana son obligatorios y prioritarios.
1.2. **Regla de Oro TOTP:** Queda terminantemente prohibido el uso de bibliotecas de alto nivel para TOTP (como `otplib`, `speakeasy`, etc.). El algoritmo debe implementarse desde sus fundamentos matemáticos según el RFC 6238 (HMAC-SHA1, conversión Big-Endian de 64 bits, Dynamic Truncation y módulo 10^6).
1.3. Se permite el uso exclusivo de primitivas criptográficas de bajo nivel auditadas y compatibles con el runtime móvil.

### Artículo 2: Seguridad como Prioridad Arquitectónica
2.1. Las aplicaciones móviles son clientes públicos (*Public Clients*): nunca deben custodiar un `client_secret` ni asumir que el almacenamiento local no cifrado es seguro.
2.2. **Separación de memoria y tokens:**
   - El `access_token` vive exclusivamente en memoria volátil (RAM). Se destruye al cerrar la app o matar el proceso. Vida útil máxima: 5 minutos.
   - El `refresh_token` se persiste únicamente en almacenamiento seguro respaldado por hardware (`expo-secure-store`: iOS Keychain / Android Keystore). Vida útil: 30 días.
   - Queda estrictamente prohibido guardar tokens o credenciales en `AsyncStorage`, `localStorage` o texto plano.
2.3. **Navegador Seguro:** La autenticación OAuth 2.0 debe delegarse obligatoriamente al navegador seguro del sistema operativo (`WebBrowser.openAuthSessionAsync` / `ASWebAuthenticationSession` / `Custom Tabs`). Queda prohibido el uso de WebViews embebidas estándar.
2.4. **Protección Anti-CSRF:** Cada flujo OAuth debe generar un parámetro criptográfico `state` único y validarlo estrictamente al recibir el Deep Link.
2.5. **Protección Anti-Replay:** El backend debe invalidar inmediatamente cualquier código TOTP ya utilizado registrándolo en una caché con TTL de 90 segundos y respondiendo `409 Conflict`.
2.6. **Validación de Reloj:** El backend debe tolerar un desfase temporal de reloj de exactamente 3 ventanas: C-1 (t - 30s), C (t), C+1 (t + 30s).
2.7. Ningún secreto, token o variable sensible debe subirse al repositorio ni imprimirse en logs de consola en entornos productivos.

### Artículo 3: Metodología Spec-Driven Development (SDD)
3.1. Ninguna línea de código de producción o infraestructura se escribirá sin antes contar con su correspondiente especificación (`spec.md`), plan arquitectónico (`plan.md`) y lista de tareas (`tasks.md`) aprobados formalmente.
3.2. Cada funcionalidad debe pasar por el ciclo: **Specify -> Plan -> Tasks -> Implement -> Verify -> Document**.
3.3. Toda modificación al alcance debe documentarse como una decisión arquitectónica (ADR) o actualización de especificación.

### Artículo 4: Calidad de Software, Modularidad y Tipado Estricto
4.1. Todo el código del cliente móvil y backend debe estar escrito en TypeScript con tipado estricto (`strict: true`). No se tolera el uso indiscriminado de `any`.
4.2. Se debe mantener una estricta separación de responsabilidades:
   - Capa de presentación (UI / Screens / Components).
   - Capa de lógica de negocio (Hooks / State / Services).
   - Capa criptográfica y seguridad (Core Crypto / Storage).
   - Capa de transporte y red (HTTP Client / Interceptors / Deep Linking).
4.3. El código debe ser limpio, modular, legible y estructurado de forma que el estudiante pueda explicar y defender académicamente cada línea.

### Artículo 5: Verificación y Pruebas Previas a la Entrega
5.1. Una funcionalidad no se considera "terminada" hasta que sus pruebas de aceptación hayan sido ejecutadas y superadas.
5.2. Escenarios obligatorios de sustentación:
   1. Flujo OAuth 2.0 + PKCE mediante navegador nativo.
   2. Paridad 100% de TOTP con Google Authenticator oficial con la misma semilla Base32.
   3. Generación matemática de TOTP 100% offline en **Modo Avión**.
   4. Step-Up Authentication capturando `403 Forbidden` y elevando sesión a la Bóveda Crítica.
   5. Ataque de Repetición rechazado por el backend con `409 Conflict`.
5.3. Cada fase concluida debe acompañarse de un commit descriptivo y guía paso a paso de verificación para el usuario.

### Artículo 6: Control Humano y Prohibición de Suposiciones
6.1. El asistente actúa como guía, arquitecto y revisor, pero la autoridad final recae en el usuario.
6.2. Toda decisión arquitectónica relevante (framework backend, librerías criptográficas, proveedores OAuth, gestión de estado) debe presentarse mediante la estructura de **Decisión Técnica Pendiente** y esperar la aprobación explícita del usuario antes de proceder.
6.3. Al finalizar cada fase, el trabajo se detiene obligatoriamente para revisión, pruebas y aprobación formal antes de iniciar la siguiente.

