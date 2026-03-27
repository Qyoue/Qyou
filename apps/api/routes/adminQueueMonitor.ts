import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

const readQueueReportModel = () => {
  try {
    return require('../models/QueueReport') as {
      QueueReport?: {
        countDocuments: (filter: Record<string, unknown>) => Promise<number>;
        find: (filter: Record<string, unknown>) => {
          sort: (sort: Record<string, number>) => {
            limit: (limit: number) => { lean: () => Promise<Array<Record<string, unknown>>> };
          };
        };
      };
    };
  } catch {
    return null;
  }
};

router.get('/queue-monitor', requireAdmin, async (_req, res) => {
  const queueReportModule = readQueueReportModel();

  if (!queueReportModule?.QueueReport) {
    return res.json({
      success: true,
      data: {
        totals: {
          acceptedReports: 0,
          staleLocations: 0,
        },
        recentReports: [],
      },
    });
  }

  const [acceptedReports, recentReports] = await Promise.all([
    queueReportModule.QueueReport.countDocuments({ status: 'accepted' }),
    queueReportModule.QueueReport.find({ status: 'accepted' })
      .sort({ reportedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const staleLocations = recentReports.filter((report) => {
    const reportedAt = report.reportedAt instanceof Date ? report.reportedAt : new Date(String(report.reportedAt));
    return Date.now() - reportedAt.getTime() > 30 * 60 * 1000;
  }).length;

  return res.json({
    success: true,
    data: {
      totals: {
        acceptedReports,
        staleLocations,
      },
      recentReports: recentReports.map((report) => ({
        id: String(report._id || ''),
        locationId: String(report.locationId || ''),
        userId: String(report.userId || ''),
        level: String(report.level || 'unknown'),
        waitTimeMinutes: report.waitTimeMinutes,
        reportedAt: report.reportedAt,
      })),
    },
  });
});

export const adminQueueMonitorRouter = router;

