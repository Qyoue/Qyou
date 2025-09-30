import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './utils/config';
import { requestLogger, requestId } from './middleware/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors(config.cors));

// Request ID middleware
app.use(requestId);

// Request logging
app.use(requestLogger(config.nodeEnv));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`[api]: Server is running at http://localhost:${config.port}`);
  console.log(`[api]: Environment: ${config.nodeEnv}`);
});
