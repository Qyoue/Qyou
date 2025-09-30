import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import express, { Request, Response } from 'express';
import router from './routes/userRoutes';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './utils/config';
import { requestLogger, requestId } from './middleware/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import routes from './routes';


const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/auth', authRoutes);

app.use(helmet());

app.use("/api/users", router);


app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Qyou API is healthy!' });
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qyou';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`[api]: Server is running at http://localhost:${port}`);

 app.use(cors(config.cors));


app.use(requestId);


app.use(requestLogger(config.nodeEnv));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use('/api', routes);


app.use(notFound);


app.use(errorHandler);


app.listen(config.port, () => {
  console.log(`[api]: Server is running at http://localhost:${config.port}`);
  console.log(`[api]: Environment: ${config.nodeEnv}`);

});

