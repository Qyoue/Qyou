import { Router } from 'express';
import { requireAuth } from '../shared/middleware/auth-middleware.js';
import { requireOperatorRole } from '../middleware/operatorAuth.js';

export function registerOperatorRoutes(): Router {
  const router = Router();

  router.get('/pool/health', requireAuth, requireOperatorRole(), (_req, res) => {
    res.json({ status: 'ok', pool: 'healthy' });
  });

  router.get('/pool/config', requireAuth, requireOperatorRole(), (_req, res) => {
    res.json({ config: {} });
  });

  return router;
}
