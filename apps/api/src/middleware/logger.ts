import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

// Custom token for request ID
morgan.token('reqId', (req: Request) => (req as any).id || 'unknown');

// Custom format for development
const devFormat = ':reqId :method :url :status :response-time ms - :res[content-length]';

// Custom format for production
const prodFormat = ':reqId :remote-addr :method :url :status :response-time ms :res[content-length]';

export const requestLogger = (environment: string) => {
  const format = environment === 'production' ? prodFormat : devFormat;
  return morgan(format);
};

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  (req as any).id = Math.random().toString(36).substr(2, 9);
  next();
};
