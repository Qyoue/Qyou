import { RequestHandler } from 'express';
import { grantQueueReportReward } from '../services/queueReportRewards';

type JsonResponse = {
  success?: boolean;
  data?: Record<string, unknown>;
};

const buildReportReference = (req: Parameters<RequestHandler>[0], body?: JsonResponse) => {
  const requestReference = String(req.body?.reportReference || req.body?.idempotencyKey || '').trim();
  const responseReference = String(body?.data?.reportId || body?.data?.id || '').trim();
  return responseReference || requestReference || `queue-report:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
};

export const queueReportRewardMiddleware: RequestHandler = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = ((body?: JsonResponse) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
      const reportReference = buildReportReference(req, body);

      void grantQueueReportReward({
        authorizationHeader: req.headers.authorization,
        reportReference,
        metadata: {
          path: req.originalUrl,
          method: req.method,
        },
      });
    }

    return originalJson(body);
  }) as typeof res.json;

  next();
};
