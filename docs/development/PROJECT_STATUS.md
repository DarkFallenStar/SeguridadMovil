# ESTADO DEL PROYECTO (PROJECT STATUS)
**Proyecto:** Taller de Seguridad Móvil (UniSabana)  
**Última actualización:** 2026-11-08  
**Fase actual:** PROYECTO 100% COMPLETADO (Fases 0 a 9 Finalizadas y Verificadas)  
**Repositorio Remoto:** https://github.com/DarkFallenStar/SeguridadMovil.git  

---

## 1. TABLERO DE CONTROL DE FASES

| Fase | Título | Estado | Especificación | Aprobación |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 0** | Auditoría, diagnóstico y marco SDD | **Completado** | `.specify/memory/constitution.md` | **Aprobado** |
| **Fase 1** | Arquitectura y estructura base (Monorepo) | **Completado** | `specs/001-project-foundation/` | **Aprobado** |
| **Fase 2** | OAuth 2.0 con PKCE & Deep Linking | **Completado** | `specs/002-oauth-pkce/` | **Aprobado** |
| **Fase 3** | Almacenamiento seguro nativo y Silent Refresh Queue | **Completado** | `specs/003-token-management/` | **Aprobado** |
| **Fase 4** | Algoritmo TOTP desde cero (RFC 6238 en Modo Avión) | **Completado** | `specs/004-totp-authenticator/` | **Aprobado** |
| **Fase 5** | Configuración de Semilla TOTP (QR Camera + Manual + SecureStore) | **Completado** | `specs/005-seed-provisioning/` | **Aprobado** |
| **Fases 6/7** | Backend Bóveda, Step-Up Authentication y Caché Anti-Replay (TTL 90s) | **Completado** | `specs/007-step-up-anti-replay/` | **Aprobado** |
| **Fases 8/9** | Integración global, Matriz de Trazabilidad, `README.md` y Guía de Sustentación (5 min) | **Completado** | `specs/009-audit-demonstration/` | **Aprobado** |

---

## 2. REGISTRO DE DECISIONES TÉCNICAS (ADR)

| Código | Decisión | Alternativas | Selección | Justificación | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-00** | Metodología de Desarrollo | SDD vs Ad-Hoc | **Spec-Driven Development (SDD)** | Trazabilidad y rigor académico | **Aprobado** |
| **ADR-01** | Tecnología del Backend | Express (TS) vs FastAPI (Python) | **Node.js + Express con TypeScript** | Unifica la pila tecnológica en TypeScript y aprovecha Node 24 | **Aprobado** |
| **ADR-02** | Estructura del Repositorio | Proyecto Raíz vs Monorepo `/mobile-app` + `/backend-auth` | **Monorepo Estructurado** | Cumplimiento estricto de entregables de la rúbrica | **Aprobado** |
| **ADR-03** | Servidor Proveedor OAuth 2.0 | Mock Server local vs Auth0/Google | **Servidor Propio en `/backend-auth`** | Cero dependencia de internet en aula y control exacto de 5 min TTL | **Aprobado** |
| **ADR-04** | Primitiva Cripto TOTP | Librería externa vs Implementación RFC 3174/2104/6238 en TS puro | **SHA-1 + HMAC-SHA1 + RFC 6238 en TypeScript puro (0 dependencias)** | Cero bloat, evita problemas de resolución ESM en Metro y tiene 100% paridad con Google Authenticator | **Aprobado** |
| **ADR-05** | Almacenamiento Backend y Caché Anti-Replay | `Map` nativo en memoria RAM (`1A`) vs SQLite (`1B`) | **`Map` Nativo en Memoria RAM con TTL 90s (`1A`)** | Cumple literalmente el Punto 4 de la guía ("se registra en memoria con TTL de 90 segundos"), atómico en Event Loop y fácil de defender en sustentación | **Aprobado** |
| **ADR-06** | Repositorio Remoto Git | - | **GitHub `DarkFallenStar/SeguridadMovil`** | Control de versiones y push tras cada fase | **Aprobado** |
| **ADR-07** | Ingesta y Persistencia TOTP | Solo manual (`1A`) vs Cámara QR + Manual + `SecureStore` (`1B` + `2B` + `3B`) | **Escáner QR (`expo-camera`) + Manual + `expo-secure-store` + `/auth/mfa/setup`** | Cubre las Opciones A y B del Punto 3, persiste offline en Modo Avión y ofrece QR web para la Prueba de Aceptación #2 | **Aprobado** |
| **ADR-08** | Ruta del Recurso Protegido de Bóveda | Solo `/api/boveda-critica` (`2A`) vs Ambas rutas (`2B`) | **Soportar `/api/boveda-critica` y alias `/api/boveda` (`2B`)** | Resuelve la inconsistencia entre Sección 2 y Punto 4 de la guía sin duplicar lógica | **Aprobado** |

---

## 3. CHECKLIST GLOBAL DE CIERRE (100% COMPLETADO)
- [x] **Punto 1 (OAuth 2.0 + PKCE):** `code_verifier` CSPRNG, `code_challenge` SHA-256 Base64URL, `expo-web-browser`, Deep Link `unisabana-auth://` y validación anti-CSRF `state`.
- [x] **Punto 2 (Almacenamiento Híbrido y Silent Refresh):** `access_token` solo en RAM (5 min), `refresh_token` en `expo-secure-store` (30 días), interceptor `401` con cola de concurrencia (`Silent Refresh Queue`) y persistencia tras reinicio de app.
- [x] **Punto 3 (Autenticador TOTP RFC 6238):** Decodificador Base32, contador 64-bit Big-Endian, HMAC-SHA1, Dynamic Truncation, cámara QR (`expo-camera`) + entrada manual, anillo regresivo de 30s, paridad con Google Authenticator y funcionamiento en Modo Avión.
- [x] **Punto 4 (Step-Up Auth y Anti-Replay):** `GET /api/boveda-critica` rechaza tokens sin MFA (`403 mfa_required` + `step_up_token`), `POST /auth/mfa/verify` valida ventanas $C-1, C, C+1$, caché Anti-Replay en memoria (`Map` TTL 90s) bloquea reuso con `409 Conflict` y emite `elevated_token` (`mfa_verified: true`, 10 min).
- [x] **Documentación y Sustentación:** Matriz de trazabilidad (`specs/009-audit-demonstration/spec.md`) y `README.md` con guía de sustentación en vivo de 5 minutos.
