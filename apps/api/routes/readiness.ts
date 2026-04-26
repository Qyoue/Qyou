import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /ready
 * Readiness probe — returns 200 only when all dependencies are reachable.
 * Distinct from GET /health (liveness), which just confirms the process is up.
 */
router.get('/', (_req, res) => {
  const dbState = mongoose.connection.readyState;

  if (dbState !== 1) {
    res.status(503).json({
      status: 'not ready',
      checks: { db: 'disconnected' },
    });
    return;
  }

  res.json({
    status: 'ready',
    checks: { db: 'connected' },
    timestamp: new Date(),
  });
});

export const readinessRouter = router;
