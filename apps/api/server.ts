import mongoose from 'mongoose';

import { validateApiEnv } from '../../libs/config/src/validateApiEnv';
import { logger } from './logger';
import { ensureLocationIndexes } from './models/Location';
import { shutdownLocationCache } from './services/locationCache';
import { createApp } from './app';

validateApiEnv();

const PORT = process.env.API_PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/qyou';

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  await ensureLocationIndexes();
  logger.info('MongoDB connected');
}

async function start() {
  await connectDB();

  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info(`API running on http://localhost:${PORT}`);
  });

  function shutdown() {
    server.close(async () => {
      await shutdownLocationCache();
      await mongoose.disconnect();
      process.exit(0);
    });
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled rejection');
    shutdown();
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    shutdown();
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
