import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { HealthResponse, ApiErrorResponse } from './types/index.js';

export const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de verificacion de salud (Health Check)
app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.status(200).json({
    status: 'ok',
    service: 'backend-auth',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Middleware para rutas no encontradas (404)
app.use((_req: Request, res: Response<ApiErrorResponse>) => {
  res.status(404).json({
    error: 'not_found',
    message: 'La ruta solicitada no existe en el servidor de autenticacion.',
  });
});

// Middleware centralizado de manejo de errores (500)
app.use((err: Error, _req: Request, res: Response<ApiErrorResponse>, _next: NextFunction) => {
  console.error('[SERVER ERROR]:', err);
  res.status(500).json({
    error: 'internal_server_error',
    message: err.message || 'Error interno del servidor.',
  });
});
