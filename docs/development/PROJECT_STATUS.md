# ESTADO DEL PROYECTO (PROJECT STATUS)
**Proyecto:** Taller de Seguridad Móvil (UniSabana)  
**Última actualización:** 2026-11-08  
**Fase actual:** FASES 6 Y 7 COMPLETADAS (4/4 Puntos del Taller Implementados) — Esperando aprobación para FASES 8 Y 9 (Auditoría Final, README y Guía de Sustentación)  
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
| **Fases 6/7** | Backend Bóveda, Step-Up Authentication y Caché Anti-Replay (TTL 90s) | **Completado** | `specs/007-step-up-anti-replay/` | **En validación usuario** |
| **Fases 8/9** | Integración global, Matriz de Trazabilidad, `README.md` y Guía de Sustentación (5 min) | **Siguiente** | `specs/009-audit-demonstration/` | Pendiente |

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

## 3. CHECKLIST DE VERIFICACIÓN DE FASES 6 Y 7 (STEP-UP AUTHENTICATION & ANTI-REPLAY)
- [x] Protección de `GET /api/boveda-critica` (y alias `GET /api/boveda`) en `backend-auth/src/routes/apiRoutes.ts`.
- [x] Rechazo de sesiones normales (`mfa_verified: false`) con `403 Forbidden`, `error: "mfa_required"` y emisión de `step_up_token`.
- [x] Endpoint `POST /auth/mfa/verify` en `backend-auth/src/routes/authRoutes.ts`.
- [x] Tolerancia a desfase de reloj (*Clock Skew*) validando en las 3 ventanas: $C-1$ ($t-30\text{s}$), $C$ ($t$) y $C+1$ ($t+30\text{s}$).
- [x] Caché Anti-Replay en memoria (`Map` en `backend-auth/src/services/antiReplayService.ts`) con TTL de 90 segundos.
- [x] Rechazo inmediato con `409 Conflict: Replay Attack Detected` al intentar reutilizar un código TOTP dentro de los 90 segundos.
- [x] Emisión de `elevated_token` con el claim `mfa_verified: true` y expiración de 10 minutos (`600 segundos`).
- [x] Integración completa en `VaultScreen.tsx` con captura de `403`, modal 2FA, desbloqueo de bóveda y botón demostrativo para el Escenario #5 (`409 Conflict`).
- [x] Batería de 5 pruebas automatizadas superadas al 100% (`backend-auth/src/tests/stepUpAntiReplay.test.ts`).
