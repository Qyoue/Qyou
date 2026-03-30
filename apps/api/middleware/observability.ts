import { RequestHandler } from 'express';
import { incrementCounter, recordRequestMetric } from '../services/metrics';

const normalizeRoute = (originalUrl: string) => originalUrl.split('?')[0] || '/';

export const requestMetricsMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const route = normalizeRoute(req.originalUrl || req.url || '/');
    const roundedDurationMs = Number(durationMs.toFixed(2));

    recordRequestMetric({
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs: roundedDurationMs,
    });

    if (route.startsWith('/queues/report')) {
      incrementCounter('queueReportRequests');
      if (res.statusCode >= 400) {
        incrementCounter('queueReportFailures');
      }
    }

    if (route.startsWith('/auth') && res.statusCode >= 400 && res.statusCode < 500) {
      incrementCounter('authFailures');
    }
  });

  next();
};
