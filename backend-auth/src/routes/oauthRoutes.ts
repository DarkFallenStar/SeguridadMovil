import { Router } from 'express';
import {
  authorizeGetController,
  approveGetController,
  sessionStatusController,
  authorizePostController,
  tokenController,
} from '../controllers/oauthController.js';

export const oauthRouter = Router();

// Rutas de Autorización, Confirmación, Estado de Sesión y Token Exchange (RFC 6749 y RFC 7636)
oauthRouter.get('/authorize', authorizeGetController);
oauthRouter.get('/approve', approveGetController);
oauthRouter.get('/session-status', sessionStatusController);
oauthRouter.post('/authorize', authorizePostController);
oauthRouter.post('/token', tokenController);
