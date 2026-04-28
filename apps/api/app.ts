import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { requestMetricsMiddleware } from './middleware/observability';
import { adminAuditLogsRouter } from './routes/adminAuditLogs';
import { adminLocationSeedRouter } from './routes/adminLocationSeed';
import { authRouter } from './routes/auth';
import { internalMetricsRouter } from './routes/internalMetrics';
import { locationsRouter } from './routes/locations';
import { queuesRouter } from './routes/queues';
import { readinessRouter } from './routes/readiness';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestMetricsMiddleware);

  app.use('/auth', authRouter);
  app.use('/admin', adminLocationSeedRouter);
  app.use('/admin/audit', adminAuditLogsRouter);
  app.use('/internal', internalMetricsRouter);
  app.use('/locations', locationsRouter);
  app.use('/queues', queuesRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Qyou API', timestamp: new Date() });
  });

  app.use('/ready', readinessRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
