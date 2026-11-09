# ESTADO DEL PROYECTO (PROJECT STATUS)
**Proyecto:** Taller de Seguridad Móvil (UniSabana)  
**Última actualización:** 2026-11-08  
**Fase actual:** FASE 2 COMPLETADA — Esperando aprobación para iniciar FASE 3  
**Repositorio Remoto:** https://github.com/DarkFallenStar/SeguridadMovil.git  

---

## 1. TABLERO DE CONTROL DE FASES

| Fase | Título | Estado | Especificación | Aprobación |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 0** | Auditoría, diagnóstico y marco SDD | **Completado** | `.specify/memory/constitution.md` | **Aprobado** |
| **Fase 1** | Arquitectura y estructura base (Monorepo) | **Completado** | `specs/001-project-foundation/` | **Aprobado** |
| **Fase 2** | OAuth 2.0 con PKCE & Deep Linking | **Completado** | `specs/002-oauth-pkce/` | **Aprobado** |
| **Fase 3** | Almacenamiento seguro nativo y Silent Refresh Queue | **Siguiente** | `specs/003-token-management/` | Pendiente |
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
| **ADR-00** | Metodología de Desarrollo | SDD vs Ad-Hoc | **Spec-Driven Development (SDD)** | Trazabilidad y rigor académico | **Aprobado** |
| **ADR-01** | Tecnología del Backend | Express (TS) vs FastAPI (Python) | **Node.js + Express con TypeScript** | Unifica la pila tecnológica en TypeScript y aprovecha Node 24 | **Aprobado** |
| **ADR-02** | Estructura del Repositorio | Proyecto Raíz vs Monorepo `/mobile-app` + `/backend-auth` | **Monorepo Estructurado** | Cumplimiento estricto de entregables de la rúbrica | **Aprobado** |
| **ADR-03** | Servidor Proveedor OAuth 2.0 | Mock Server local vs Auth0/Google | **Servidor Propio en `/backend-auth`** | Cero dependencia de internet en aula y control exacto de 5 min TTL | **Aprobado** |
| **ADR-04** | Primitiva Cripto TOTP | Algoritmo SHA-1 a mano vs Primitiva bajo nivel | **Primitiva HMAC de bajo nivel + RFC 6238 propio** | Evita bugs sutiles en SHA-1 y garantiza 100% paridad con Google Auth | **Aprobado** |
| **ADR-05** | Persistencia Backend | Memoria volátil vs SQLite | **SQLite (`node:sqlite` nativo)** | Persistencia atómica de caché Anti-Replay sin dependencias nativas externas | **Aprobado** |
| **ADR-06** | Repositorio Remoto Git | - | **GitHub `DarkFallenStar/SeguridadMovil`** | Control de versiones y entrega formal | **Aprobado** |

---

## 3. CHECKLIST DE VERIFICACIÓN DE FASE 2 (OAUTH 2.0 + PKCE)
- [x] Generador criptográfico de `code_verifier` (64 caracteres URL-safe de alta entropía).
- [x] Generador de `code_challenge` mediante SHA-256 codificado en Base64URL sin relleno (*unpadded*).
- [x] Generador de parámetro `state` aleatorio (32 chars) y validación estricta Anti-CSRF al retornar del Deep Link.
- [x] Configuración del esquema `"scheme": "unisabana-auth"` en `mobile-app/app.json`.
- [x] Navegador seguro del sistema (`expo-web-browser`) con `WebBrowser.openAuthSessionAsync` (WebViews prohibidas).
- [x] Backend OAuth Server: endpoints `GET /oauth/authorize`, `POST /oauth/authorize` y `POST /oauth/token`.
- [x] Validación PKCE en backend: comprobación en tiempo constante de `SHA256(verifier) === challenge`.
- [x] Single-use / Anti-Replay del `authorization_code` (invalidado inmediatamente tras el intercambio).
- [x] Emisión de `access_token` JWT con TTL de exactamente 5 minutos (300s) y `refresh_token` con 30 días.
- [x] Batería de 5 pruebas automatizadas superadas al 100% (`backend-auth/src/tests/pkce.test.ts`).
