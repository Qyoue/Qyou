import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;
  res.setHeader('x-request-id', id);
  next();
}
