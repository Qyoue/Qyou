import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { createQueueReport } from '../services/queueReports';
import { buildQueueSnapshotForLocation } from '../services/queueSnapshots';
import { getQueueHistoryForLocation } from '../services/queueHistory';

const router = Router();

router.post('/report', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const report = await createQueueReport({
    locationId: String(req.body?.locationId || ''),
    userId: authReq.auth.userId,
    waitTimeMinutes:
      req.body?.waitTimeMinutes === undefined ? undefined : Number(req.body.waitTimeMinutes),
    level: String(req.body?.level || 'unknown') as 'none' | 'low' | 'medium' | 'high' | 'unknown',
    notes: req.body?.notes,
  });

  const snapshot = await buildQueueSnapshotForLocation(String(report.locationId));

  res.status(201).json({
    success: true,
    data: {
      report: {
        id: String(report._id),
        locationId: String(report.locationId),
        userId: String(report.userId),
        level: report.level,
        waitTimeMinutes: report.waitTimeMinutes,
        notes: report.notes,
        reportedAt: report.reportedAt,
      },
      snapshot,
    },
  });
});

router.get('/:locationId/history', async (req, res) => {
  const { locationId } = req.params;
  const windowHours = req.query.windowHours !== undefined ? Number(req.query.windowHours) : undefined;
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;

  const result = await getQueueHistoryForLocation({ locationId, windowHours, limit });

  res.json({ success: true, data: result });
});

export const queuesRouter = router;

