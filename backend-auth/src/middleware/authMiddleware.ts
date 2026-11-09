import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../services/jwtService.js';
import { TokenPayload } from '../types/index.js';

// Extender la interfaz Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware que exige un access_token válido.
 * Si el token expiró o la firma es inválida, responde 401 Unauthorized para activar
 * el Silent Refresh Queue en la aplicación móvil.
 */
export function requireAccessToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'token_missing',
      message: 'Encabezado de autorización ausente o formato incorrecto (Bearer <token>).',
    });
  }

  const token = authHeader.substring(7); // Quitar 'Bearer '
  const verification = verifyJwt<TokenPayload>(token);

  if (!verification.valid || !verification.payload) {
    return res.status(401).json({
      error: 'token_expired',
      message: verification.error || 'El access_token ha expirado o es inválido.',
    });
  }

  if (verification.payload.tokenType !== 'access' && verification.payload.tokenType !== 'elevated') {
    return res.status(401).json({
      error: 'invalid_token_type',
      message: 'Tipo de token no permitido para esta ruta.',
    });
  }

  req.user = verification.payload;
  return next();
}

