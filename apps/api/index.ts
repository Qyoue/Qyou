import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import { STELLAR_CONFIG } from '@qyou/stellar';
import { AuthError } from './errors/AppError';
import { logger } from './logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { ensureLocationIndexes } from './models/Location';
import { adminLocationSeedRouter } from './routes/adminLocationSeed';
import { locationsRouter } from './routes/locations';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.API_PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/qyou';

app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/admin', adminLocationSeedRouter);
app.use('/locations', locationsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Qyou API', timestamp: new Date() });
});

app.get('/protected-example', (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return next(new AuthError('Missing bearer token'));
  }

  res.json({ success: true });
});

app.use(notFoundHandler);
app.use(errorHandler);

const connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  await ensureLocationIndexes();
  logger.info('MongoDB connected');
  logger.info('Location 2dsphere index ensured');
};

const server = app.listen(PORT, async () => {
  await connectDB();
  logger.info(`API running on http://localhost:${PORT}`);

  // LOG THE STELLAR CONFIG TO PROVE IT WORKS
  logger.info(`Stellar mode: ${STELLAR_CONFIG.network}`);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  server.close(() => process.exit(1));
});
