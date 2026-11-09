import { Router } from 'express';
import {
  authorizeGetController,
  authorizePostController,
  tokenController,
} from '../controllers/oauthController.js';

export const oauthRouter = Router();

// Rutas de Autorización y Token Exchange (RFC 6749 y RFC 7636)
oauthRouter.get('/authorize', authorizeGetController);
oauthRouter.post('/authorize', authorizePostController);
oauthRouter.post('/token', tokenController);

