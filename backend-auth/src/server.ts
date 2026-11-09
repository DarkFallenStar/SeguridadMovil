import { app } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

export const server = app.listen(PORT, HOST, () => {
  console.log(`===================================================`);
  console.log(`🔐 BACKEND-AUTH (Taller Seguridad Movil) ACTIVO`);
  console.log(`📡 URL Local:    http://localhost:${PORT}`);
  console.log(`📡 URL Red:      http://${HOST}:${PORT}`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
