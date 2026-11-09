# ESTADO DEL PROYECTO (PROJECT STATUS)
**Proyecto:** Taller de Seguridad Móvil (UniSabana)  
**Última actualización:** 2026-11-08  
**Fase actual:** FASE 4 COMPLETADA — Esperando aprobación y decisiones técnicas para iniciar FASE 5  
**Repositorio Remoto:** https://github.com/DarkFallenStar/SeguridadMovil.git  

---

## 1. TABLERO DE CONTROL DE FASES

| Fase | Título | Estado | Especificación | Aprobación |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 0** | Auditoría, diagnóstico y marco SDD | **Completado** | `.specify/memory/constitution.md` | **Aprobado** |
| **Fase 1** | Arquitectura y estructura base (Monorepo) | **Completado** | `specs/001-project-foundation/` | **Aprobado** |
| **Fase 2** | OAuth 2.0 con PKCE & Deep Linking | **Completado** | `specs/002-oauth-pkce/` | **Aprobado** |
| **Fase 3** | Almacenamiento seguro nativo y Silent Refresh Queue | **Completado** | `specs/003-token-management/` | **Aprobado** |
| **Fase 4** | Algoritmo TOTP desde cero (RFC 6238 en Modo Avión) | **Completado** | `specs/004-totp-authenticator/` | **En validación usuario** |
| **Fase 5** | Configuración de Semilla TOTP (QR Camera + Manual + Persistencia) | **Siguiente** | `specs/005-seed-provisioning/` | Pendiente |
| **Fase 6** | Backend de autenticación, bóveda y sesiones | Planificado | `specs/006-auth-backend/` | Pendiente |
| **Fase 7** | Step-Up Authentication y Anti-Replay Cache | Planificado | `specs/007-step-up-anti-replay/` | Pendiente |
| **Fase 8** | Integración global y pulido E2E | Planificado | `specs/008-system-integration/` | Pendiente |
| **Fase 9** | Pruebas de aceptación, auditoría y sustentación | Planificado | `specs/009-audit-demonstration/` | Pendiente |

---

## 2. REGISTRO DE DECISIONES TÉCNICAS (ADR)

| Código | Decisión | Alternativas | Selección | Justificación | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-00** | Metodología de Desarrollo | SDD vs Ad-Hoc | **Spec-Driven Development (SDD)** | Trazabilidad y rigor académico | **Aprobado** |
| **ADR-01** | Tecnología del Backend | Express (TS) vs FastAPI (Python) | **Node.js + Express con TypeScript** | Unifica la pila tecnológica en TypeScript y aprovecha Node 24 | **Aprobado** |
| **ADR-02** | Estructura del Repositorio | Proyecto Raíz vs Monorepo `/mobile-app` + `/backend-auth` | **Monorepo Estructurado** | Cumplimiento estricto de entregables de la rúbrica | **Aprobado** |
| **ADR-03** | Servidor Proveedor OAuth 2.0 | Mock Server local vs Auth0/Google | **Servidor Propio en `/backend-auth`** | Cero dependencia de internet en aula y control exacto de 5 min TTL | **Aprobado** |
| **ADR-04** | Primitiva Cripto TOTP | Librería externa vs Implementación RFC 3174/2104/6238 en TS puro | **SHA-1 + HMAC-SHA1 + RFC 6238 en TypeScript puro (0 dependencias)** | Cero bloat, evita problemas de resolución ESM en Metro y tiene 100% paridad con RFC 6238 y Google Authenticator | **Aprobado** |
| **ADR-05** | Persistencia Backend | Memoria volátil vs SQLite | **Pendiente de confirmación para Fase 6/7** | Definir si mantenemos estructura en memoria controlada o SQLite nativo | Pendiente |
| **ADR-06** | Repositorio Remoto Git | - | **GitHub `DarkFallenStar/SeguridadMovil`** | Control de versiones y push tras cada fase | **Aprobado** |

---

## 3. ESTADO DE CODEBASE MEMORY MCP
- **Disponibilidad actual en el entorno:** No se detecta servidor MCP `codebase-memory-mcp` conectado en la sesión actual del IDE.
- **Estrategia de ahorro de tokens activa:** Lectura quirúrgica de archivos, uso de `PROJECT_STATUS.md`, `.specify/memory/constitution.md` y especificaciones en `specs/` como memoria persistente entre sesiones, evitando re-exploraciones completas del repositorio.

---

## 4. CHECKLIST DE VERIFICACIÓN DE FASE 4 (ALGORITMO TOTP DESDE CERO — RFC 6238)
- [x] Prohibición absoluta de librerías de alto nivel (`otplib`, `speakeasy`) cumplida (0 dependencias externas).
- [x] Decodificador Base32 puro según RFC 4648 (`mobile-app/src/crypto/base32.ts`).
- [x] Conversión del contador temporal $T = \lfloor \text{UnixTimestamp} / 30 \rfloor$ a entero de 64 bits Big-Endian (`8 bytes`).
- [x] Implementación de `SHA-1` (RFC 3174) y `HMAC-SHA1` (RFC 2104) en `mobile-app/src/crypto/totp.ts`.
- [x] Implementación de *Dynamic Truncation* (`offset = H[19] & 0x0f`, máscara `0x7f` de 31 bits y módulo $10^6$ con `padStart(6, '0')`).
- [x] Separación estricta entre capa criptográfica (`src/crypto/`) e interfaz gráfica (`src/screens/TotpScreen.tsx`).
- [x] Temporizador visual regresivo de 30s a 0s con actualización automática y soporte 100% offline (Modo Avión).
- [x] Validador simétrico en backend (`backend-auth/src/services/totpValidator.ts`) con soporte para ventanas $C-1, C, C+1$.
- [x] Batería de 5 pruebas unitarias superadas al 100% incluyendo los vectores oficiales del Apéndice B del RFC 6238 (`backend-auth/src/tests/totp.test.ts`).
