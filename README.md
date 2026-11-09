# Taller de Seguridad Móvil: OAuth 2.0 con PKCE, Almacenamiento Criptográfico y Step-Up 2FA (TOTP)

**Curso:** Desarrollo Móvil (React Native)  
**Institución:** Universidad de La Sabana — Facultad de Ingeniería  
**Estudiante:** Daniel Eduardo Botía Valderrama  
**Arquitectura:** Monorepo con React Native (Expo SDK 58) + Node.js (Express & TypeScript)  

---

## 1. Arquitectura General del Monorepo

El proyecto está estructurado como un **Monorepo** desacoplado, cumpliendo estrictamente con los entregables de la guía de laboratorio:

```text
SeguridadMovil/
├── mobile-app/              <- Cliente Móvil en React Native con Expo
│   ├── src/
│   │   ├── config/          <- Variables de entorno y endpoints del backend
│   │   ├── screens/         <- Vistas: Login, Dashboard, Bóveda Crítica, TOTP
│   │   ├── types/           <- Modelos de datos y estados de sesión
│   │   └── ...
│   ├── App.tsx              <- Enrutamiento y control de vistas
│   ├── app.json             <- Configuración de Expo y Deep Linking
│   └── package.json
│
├── backend-auth/            <- Backend de Autenticación Ligero (Express + TS)
│   ├── src/
│   │   ├── app.ts           <- Configuración de Express, CORS y middleware
│   │   ├── server.ts        <- Punto de entrada del servidor HTTP
│   │   ├── types/           <- Interfaces TypeScript de contratos de API
│   │   └── ...
│   ├── .env.example         <- Variables de entorno de referencia
│   └── package.json
│
├── .specify/                <- Marcos y especificaciones Spec-Driven Development (SDD)
│   ├── memory/
│   │   └── constitution.md  <- Leyes inviolables del proyecto
│   └── templates/           <- Plantillas de especificación, planes y tareas
│
├── specs/                   <- Especificaciones técnicas por fase de desarrollo
│   └── 001-project-foundation/
│
└── docs/                    <- Documentación arquitectónica y estado del proyecto
    └── development/
        └── PROJECT_STATUS.md
```

---

## 2. Requisitos Previos

- **Node.js:** Versión 22 o superior (Recomendado Node.js 24+).
- **npm:** Versión 10 u 11+.
- **Dispositivo móvil físico** con Expo Go instalado, o **Emulador** (Android Studio / iOS Simulator).

---

## 3. Instrucciones de Instalación y Ejecución

### 3.1. Backend de Autenticación (`backend-auth`)

1. Abrir una terminal y navegar al directorio del backend:
   ```bash
   cd backend-auth
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   *(Ya existe un archivo `.env` configurado por defecto a partir de `.env.example`)*
   ```bash
   cp .env.example .env
   ```

4. Iniciar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   El servidor responderá en `http://localhost:3000`.  
   Endpoint de verificación de estado: `http://localhost:3000/health`.

### 3.2. Aplicación Móvil (`mobile-app`)

1. Abrir una segunda terminal y navegar al directorio móvil:
   ```bash
   cd mobile-app
   ```

2. Instalar dependencias si es necesario:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo de Expo:
   ```bash
   npx expo start
   ```

4. Ejecutar la app:
   - Presionar `a` para abrir en Emulador Android.
   - Presionar `i` para abrir en Simulador iOS.
   - Escanear el código QR con la app **Expo Go** en un dispositivo físico conectado a la misma red Wi-Fi.

---

## 4. Estado de Cumplimiento de Fases

- [x] **Fase 0:** Auditoría, diagnóstico de entorno y marco SDD inicializado.
- [x] **Fase 1:** Arquitectura base, monorepo (`mobile-app/` y `backend-auth/`), navegación base y health check.
- [ ] **Fase 2:** OAuth 2.0 con PKCE & Deep Linking (`unisabana-auth://`).
- [ ] **Fase 3:** Almacenamiento seguro nativo (`SecureStore`) y Silent Refresh Queue.
- [ ] **Fase 4:** Algoritmo TOTP desde cero en Modo Avión (RFC 6238).
- [ ] **Fase 5:** Aprovisionamiento de semilla TOTP (Cámara QR + campo manual).
- [ ] **Fase 6:** Backend de autenticación, bóveda protegida y persistencia SQLite.
- [ ] **Fase 7:** Step-Up Authentication (403 mfa_required) y Anti-Replay Cache (409 Conflict).
- [ ] **Fase 8:** Integración global End-to-End.
- [ ] **Fase 9:** Auditoría final y pruebas de sustentación en vivo.
