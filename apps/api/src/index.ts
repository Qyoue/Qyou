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

app.use(helmet());

app.use("/api/users", router);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Qyou API is healthy!' });
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

