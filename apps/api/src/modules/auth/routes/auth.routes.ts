import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import { requireAuth } from '../../../shared/middleware/auth-middleware.js';
import type { Mailer } from '../services/mailer.js';

export function createAuthRouter(authRepository: AuthRepository, mailer?: Mailer): Router {
  const authService = new AuthService(authRepository, undefined, mailer);
  const controller = new AuthController(authService);

  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.delete('/account', controller.deleteAccount);
  router.get('/sessions', requireAuth, controller.listSessions);
  router.post('/email-verification/request', controller.requestEmailVerification);
  router.post('/email-verification/confirm', controller.confirmEmailVerification);
  router.post('/password-reset/request', controller.requestPasswordReset);
  router.post('/password-reset/confirm', controller.confirmPasswordReset);

  return router;
}
