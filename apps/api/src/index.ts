import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth';
import userRouter from './routes/userRoutes';
import { config } from './utils/config';
import { requestLogger, requestId } from './middleware/logger';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// Core middleware
app.use(cors(config.cors));
app.use(helmet());
app.use(requestId);
app.use(requestLogger(config.nodeEnv));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Qyou API is healthy!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRouter);

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// DB and server start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qyou';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(config.port, () => {
      console.log(`[api]: Server is running at http://localhost:${config.port}`);
      console.log(`[api]: Environment: ${config.nodeEnv}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
