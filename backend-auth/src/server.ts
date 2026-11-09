import { app } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

export function startServer(port: number = PORT, host: string = HOST) {
  return app.listen(port, host, () => {
    console.log(`===================================================`);
    console.log(`🔐 BACKEND-AUTH (Taller Seguridad Movil) ACTIVO`);
    console.log(`📡 URL Local:    http://localhost:${port}`);
    console.log(`🩺 Health Check: http://localhost:${port}/health`);
    console.log(`===================================================`);
  });
}

// Iniciar automáticamente si se ejecuta como script principal
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  startServer();
}
