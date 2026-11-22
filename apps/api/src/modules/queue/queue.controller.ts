import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/auth-middleware.js';
import { requireOperatorRole } from '../../../middleware/operatorAuth.js';
import { InMemoryQueueRepository } from '../repositories/in-memory-queue.repository.js';
import { WaitTimeReportingService } from '../services/wait-time-reporting.service.js';
import { QueueModerationService } from '../services/queue-moderation.service.js';
import { QueueController } from '../controllers/queue.controller.js';

const repo = new InMemoryQueueRepository();
const waitTimeService = new WaitTimeReportingService();
const moderationService = new QueueModerationService();

export function createQueueRouter(): Router {
  const router = Router();
  const controller = new QueueController(repo, waitTimeService, moderationService);

  router.get('/queues', controller.list);
  router.post('/queues/:queueId/wait-time-reports', requireAuth, controller.submitWaitTimeReport);
  router.get('/queues/:queueId/wait-time-estimate', controller.getWaitTimeEstimate);
  router.post('/queues/:queueId/moderation', requireAuth, requireOperatorRole(), controller.moderate);
  router.get('/queues/:queueId/moderation/logs', requireAuth, requireOperatorRole(), controller.getModerationLogs);

  return router;
}

export const __queueTestUtils = { repo, waitTimeService, moderationService };
