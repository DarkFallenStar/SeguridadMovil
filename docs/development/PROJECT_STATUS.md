# ESTADO DEL PROYECTO (PROJECT STATUS)
**Proyecto:** Taller de Seguridad Móvil (UniSabana)  
**Última actualización:** 2026-11-08  
**Fase actual:** FASE 0 — Auditoría, descubrimiento y preparación  
**Estado general:** En espera de aprobación del informe de Fase 0 y decisiones técnicas.

---

## 1. TABLERO DE CONTROL DE FASES

| Fase | Título | Estado | Especificación | Aprobación |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 0** | Auditoría, descubrimiento y preparación | **En progreso (Informe emitido)** | `.specify/memory/constitution.md` | Pendiente |
| **Fase 1** | Arquitectura y estructura base (Monorepo / Clean Arch) | Planificado | `specs/001-project-foundation/` | Pendiente |
| **Fase 2** | OAuth 2.0 con PKCE & Deep Linking | Planificado | `specs/002-oauth-pkce/` | Pendiente |
| **Fase 3** | Almacenamiento seguro nativo y Silent Refresh Queue | Planificado | `specs/003-token-management/` | Pendiente |
| **Fase 4** | Algoritmo TOTP desde cero (RFC 6238 en Modo Avión) | Planificado | `specs/004-totp-authenticator/` | Pendiente |
| **Fase 5** | Configuración de Semilla TOTP (QR Camera + Manual) | Planificado | `specs/005-seed-provisioning/` | Pendiente |
| **Fase 6** | Backend de autenticación, bóveda y sesiones | Planificado | `specs/006-auth-backend/` | Pendiente |
| **Fase 7** | Step-Up Authentication y Anti-Replay Cache | Planificado | `specs/007-step-up-anti-replay/` | Pendiente |
| **Fase 8** | Integración global y pulido E2E | Planificado | `specs/008-system-integration/` | Pendiente |
| **Fase 9** | Pruebas de aceptación, auditoría y sustentación | Planificado | `specs/009-audit-demonstration/` | Pendiente |

---

## 2. REGISTRO DE DECISIONES TÉCNICAS (ADR)

| Código | Decisión | Alternativas | Selección | Justificación | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ADR-00 | Metodología de Desarrollo | SDD vs Ad-Hoc | Spec-Driven Development (SDD) | Trazabilidad y rigor académico | **Aprobado** |
| ADR-01 | Tecnología del Backend | Express (TS) vs FastAPI (Python) | Por definir con el usuario | Depende de entorno local | *Pendiente* |
| ADR-02 | Estructura del Repositorio | Proyecto Raíz vs Monorepo `/mobile-app` + `/backend-auth` | Monorepo limpio | Cumplimiento del entregable | *Pendiente* |
| ADR-03 | Proveedor OAuth 2.0 | Mock Server local vs Auth0/Google | Mock Auth Server en backend local | Control total de tiempos (5 min) | *Pendiente* |
| ADR-04 | Primitiva Cripto HMAC-SHA1 | Polyfill JS vs low-level CryptoJS vs react-native-quick-crypto | Primitiva SHA1 compatible Expo SDK 58 | Cero dependencias nativas incompatibles | *Pendiente* |
| ADR-05 | Almacenamiento Backend | En memoria vs SQLite | SQLite local | Persistencia y atomicidad Anti-Replay | *Pendiente* |

---

## 3. ESTADO DE CODEBASE MEMORY MCP
- **Estado:** Evaluado.
- **Detalle:** Revisado en Fase 0. En espera de instrucciones del usuario para su habilitación en el entorno Antigravity / MCP config.

---

## 4. PRÓXIMAS TAREAS INMEDIATAS
1. Revisión y validación del Informe de Auditoría de la Fase 0 por parte del estudiante.
2. Resolución de las Decisiones Técnicas Pendientes (ADR-01 a ADR-05).
3. Transición a Fase 1 tras aprobación explícita.

