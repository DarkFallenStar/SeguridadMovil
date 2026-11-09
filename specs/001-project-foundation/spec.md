# ESPECIFICACIÓN: ARQUITECTURA Y ESTRUCTURA BASE (MONOREPO)
**Código:** SPEC-001 | **Fase:** Fase 1 | **Estado:** Aprobado

---

## 1. DEFINICIÓN DEL PROBLEMA Y OBJETIVO
- **Problema:** El proyecto actual cuenta únicamente con una plantilla básica de Expo en la raíz (`/`), carece de backend y no cumple con la estructura de carpetas exigida por el taller (`/mobile-app` y `/backend-auth`). Además, se necesita una arquitectura modular, limpia y tipada que soporte los flujos de OAuth 2.0, PKCE, SecureStore, TOTP offline y Step-Up sin acoplamientos ni dependencias innecesarias.
- **Objetivo:** Establecer la base estructural del monorepo (`mobile-app/` y `backend-auth/`), configurar TypeScript estricto, la navegación móvil con React Navigation / Stack, la arquitectura en capas y verificar que tanto el cliente móvil como el servidor backend compilen y ejecuten de manera limpia.

---

## 2. REQUISITOS DEL TALLER (TRACEABILITY)
- **Sección 6 (Entregables):**
  - `/mobile-app`: Código de la aplicación en React Native (Expo).
  - `/backend-auth`: Código del backend ligero (Node.js + Express con TypeScript).
  - `README.md`: Instrucciones paso a paso de ejecución y variables de entorno.
- **Rúbrica de evaluación (15% Calidad UI/UX & Código Limpio):**
  - Arquitectura modular, separación clara de capas y tipado estricto con TypeScript.

---

## 3. REQUISITOS FUNCIONALES (RF)
- **RF-1.1 (Estructura Monorepo):** Reubicar la app móvil en `mobile-app/` e inicializar el servidor en `backend-auth/`.
- **RF-1.2 (Cliente Móvil Funcional):** La app móvil debe contar con una estructura de navegación con 3 vistas principales:
  1. *Login / Bienvenida* (punto de inicio para OAuth).
  2. *Bóveda Crítica* (pantalla protegida con Step-Up).
  3. *Autenticador TOTP* (generador de códigos 2FA y escaneo/ingreso de semilla).
- **RF-1.3 (Servidor Backend Base):** El backend en Express + TypeScript debe iniciar en un puerto configurable (por defecto `3000`), responder a un endpoint de salud (`GET /health`), soportar CORS para la app móvil y contar con middleware de manejo centralizado de errores.
- **RF-1.4 (Contratos Compartidos / DTOs):** Definir interfaces compartidas de tipos para respuestas de autenticación, errores (`error: "mfa_required"`), tokens y payloads.

---

## 4. REQUISITOS NO FUNCIONALES Y DE SEGURIDAD (RNF)
- **RNF-1.1 (TypeScript Estricto):** Ambos subproyectos deben tener `strict: true` en `tsconfig.json`.
- **RNF-1.2 (Aislamiento de Entorno):** Configuración basada en variables de entorno (`.env.example` en ambos proyectos). Ningún secreto ni URL hardcodeada en producción.
- **RNF-1.3 (Rendimiento y Zero-Jank):** Estructura desacoplada para evitar re-renderizados innecesarios en la app móvil.

---

## 5. CRITERIOS DE ACEPTACIÓN (DEFINITION OF DONE)
- [ ] La app móvil compila limpiamente (`npx tsc --noEmit`) dentro de `mobile-app/`.
- [ ] El backend compila limpiamente (`npm run build` o `npx tsc --noEmit`) dentro de `backend-auth/`.
- [ ] `GET http://localhost:3000/health` responde `{ "status": "ok", "service": "backend-auth" }`.
- [ ] La app móvil muestra la navegación base con las pantallas de Login, Bóveda y Autenticador TOTP.
- [ ] Se documentan las instrucciones de ejecución en el README.

---

## 6. RIESGOS TÉCNICOS Y MITIGACIONES
| Riesgo | Impacto | Probabilidad | Mitigación |
| :--- | :--- | :--- | :--- |
| Incompatibilidad de rutas relativas al mover Expo a subcarpeta | Medio | Baja | Ajustar rutas en `app.json` e `index.ts`. |
| Conflictos de CORS entre Expo y Express local | Alto | Media | Middleware `cors` configurado explícitamente en Express. |

