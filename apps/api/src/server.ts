import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger/index.js';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`@qyou/api listening on port ${env.PORT}`);
});
