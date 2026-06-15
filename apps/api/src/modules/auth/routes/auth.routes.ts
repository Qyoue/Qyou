import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import type { AuthRepository } from '../repositories/auth.repository.js';

export function createAuthRouter(authRepository: AuthRepository): Router {
  const authService = new AuthService(authRepository);
  const controller = new AuthController(authService);

  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);

  return router;
}
