# TAREAS DE IMPLEMENTACIÓN: ARQUITECTURA Y ESTRUCTURA BASE (MONOREPO)
**Código:** TASKS-001 | **Plan:** PLAN-001 | **Estado:** En Progreso

---

## 1. LISTA DE TAREAS SECUENCIALES

- [ ] **Tarea 1.1: Reorganización Monorepo - `mobile-app`**
  - **Descripción:** Mover los archivos del proyecto Expo (`App.tsx`, `app.json`, `package.json`, `tsconfig.json`, `index.ts`, `assets/`, etc.) dentro de la subcarpeta `mobile-app/`.
  - **Verificación:** `mobile-app` contiene la estructura completa y el `package.json` es válido.
  - **Dependencia:** Ninguna.

- [ ] **Tarea 1.2: Inicialización del Backend - `backend-auth`**
  - **Descripción:** Crear el directorio `backend-auth/` con su propio `package.json`, `tsconfig.json`, dependencias (`express`, `cors`, `better-sqlite3` o `sqlite3`, `@types/...`, `dotenv`, `tsx` para desarrollo rápido), estructura de carpetas (`src/controllers`, `src/services`, `src/middleware`, `src/types`, `src/database`).
  - **Verificación:** `npm install` exitoso en `backend-auth` y `npx tsc --noEmit` sin errores.
  - **Dependencia:** Tarea 1.1.

- [ ] **Tarea 1.3: Endpoint Base de Salud (`GET /health`) en Backend**
  - **Descripción:** Crear `src/app.ts` y `src/server.ts` con Express, habilitando CORS, middleware JSON y la ruta `GET /health`.
  - **Verificación:** Probar que el servidor levante y responda `{ "status": "ok", "service": "backend-auth" }`.
  - **Dependencia:** Tarea 1.2.

- [ ] **Tarea 1.4: Estructura Modular y Pantallas Base en `mobile-app`**
  - **Descripción:** Organizar en `mobile-app/src`:
    - `navigation/`: Enrutamiento base y tabs/stack de navegación.
    - `screens/`: `LoginScreen.tsx`, `DashboardScreen.tsx`, `VaultScreen.tsx`, `TotpScreen.tsx`.
    - `components/`: UI base.
    - `services/`: Configuración del cliente API.
    - `types/`: Tipos compartidos.
  - **Verificación:** `npx tsc --noEmit` en `mobile-app` sin errores de compilación.
  - **Dependencia:** Tarea 1.1.

- [ ] **Tarea 1.5: Configuración de Variables de Entorno y `README.md`**
  - **Descripción:** Crear `.env.example` en ambos subdirectorios y actualizar el `README.md` con las instrucciones de instalación y ejecución.
  - **Verificación:** Archivos de entorno y documentación listos.
  - **Dependencia:** Tareas 1.3 y 1.4.

---

## 2. CHECKLIST DE VERIFICACIÓN FINAL (ANTES DE COMMIT Y PUSH)
- [ ] Tipado TypeScript estricto verificado en `mobile-app` (`npx tsc --noEmit`).
- [ ] Tipado TypeScript estricto verificado en `backend-auth` (`npx tsc --noEmit`).
- [ ] Servidor backend probado con `GET /health`.
- [ ] Actualización de `PROJECT_STATUS.md`.
- [ ] Commit y push al repositorio remoto en GitHub.
