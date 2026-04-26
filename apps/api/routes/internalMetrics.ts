import { Router } from 'express';
import { getMetricsSnapshot } from '../services/metrics';

const router = Router();

router.get('/metrics', (_req, res) => {
  res.json({
    success: true,
    data: getMetricsSnapshot(),
  });
});

export const internalMetricsRouter = router;
