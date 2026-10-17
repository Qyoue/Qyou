import type { Request, Response, NextFunction } from 'express';

export function metricsMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

export function renderMetrics(): string {
  return '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\n';
}
