import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { createQueueReport } from '../services/queueReports';
import { buildQueueSnapshotForLocation } from '../services/queueSnapshots';

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

export const queuesRouter = router;

