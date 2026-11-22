import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { prisma } from './shared/database/prisma.js';
import { logger } from './shared/logger/index.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`@qyou/api listening on port ${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  const forceTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10_000);
  forceTimeout.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Shutdown complete.');
      clearTimeout(forceTimeout);
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      clearTimeout(forceTimeout);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
