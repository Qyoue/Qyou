import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../shared/middleware/auth-middleware.js';
import { requireOperatorRole } from '../../../middleware/operatorAuth.js';
import { InMemoryQueueRepository } from '../repositories/in-memory-queue.repository.js';
import { WaitTimeReportingService } from '../services/wait-time-reporting.service.js';
import { QueueModerationService } from '../services/queue-moderation.service.js';
import { realTimeWaitReportSchema, queueModerationSchema } from '@qyou/shared';

const repo = new InMemoryQueueRepository();
const waitTimeService = new WaitTimeReportingService();
const moderationService = new QueueModerationService();

const querySchema = z.object({
  q: z.string().optional(),
  category: z.enum(['bank', 'hospital', 'fuel_station', 'service_center', 'other']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function createQueueRouter(): Router {
  const router = Router();

  router.get('/queues', async (req, res, next) => {
    try {
      const { q, category, cursor, limit } = querySchema.parse(req.query);
      const items = await repo.findMany({
        searchQuery: q,
        category,
      });

      const sorted = [...items].sort((a, b) => {
        const byCreated = a.createdAt.localeCompare(b.createdAt);
        if (byCreated !== 0) return byCreated;
        return a.id.localeCompare(b.id);
      });

      let startIdx = 0;
      if (cursor) {
        const idx = sorted.findIndex((i) => i.id === cursor);
        startIdx = idx >= 0 ? idx + 1 : 0;
      }
      const page = sorted.slice(startIdx, startIdx + limit);
      const nextCursor = startIdx + limit < sorted.length ? page[page.length - 1]?.id ?? null : null;

      res.json({
        data: page,
        pageInfo: { nextCursor, limit },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/queues/:queueId/wait-time-reports', async (req, res, next) => {
    try {
      const { queueId } = req.params;
      const userId = (req as any).user?.id ?? 'anonymous';
      const input = realTimeWaitReportSchema.parse({ ...req.body, queueId });
      const report = await waitTimeService.submitReport(userId, input);
      res.status(201).json({ report });
    } catch (err) {
      next(err);
    }
  });

  router.get('/queues/:queueId/wait-time-estimate', async (req, res, next) => {
    try {
      const { queueId } = req.params;
      const metrics = waitTimeService.calculateMetrics(queueId);
      res.json({ estimate: metrics });
    } catch (err) {
      next(err);
    }
  });

  router.post('/queues/:queueId/moderation', requireAuth, requireOperatorRole(), async (req, res, next) => {
    try {
      const { queueId } = req.params;
      const operatorId = req.user!.id;
      const input = queueModerationSchema.parse({ ...req.body, queueId, operatorId });
      const record = await moderationService.applyModeration(input);
      res.status(201).json({ record });
    } catch (err) {
      next(err);
    }
  });

  router.get('/queues/:queueId/moderation/logs', requireAuth, requireOperatorRole(), async (req, res, next) => {
    try {
      const { queueId } = req.params;
      const logs = moderationService.getLogsForQueue(queueId);
      res.json({ logs });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const __queueTestUtils = { repo, waitTimeService, moderationService };
