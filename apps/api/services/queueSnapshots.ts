import { QueueReport, QueueReportDocument } from '../models/QueueReport';

export const buildQueueSnapshotForLocation = async (locationId: string) => {
  const reports = (await QueueReport.find({
    locationId,
    status: 'accepted',
  })
    .sort({ reportedAt: -1 })
    .limit(10)
    .lean()) as QueueReportDocument[];

  const latest = reports[0];
  if (!latest) {
    return {
      locationId,
      level: 'unknown' as const,
      estimatedWaitMinutes: undefined,
      reportCount: 0,
      confidence: 0,
      lastUpdatedAt: null,
      isStale: true,
    };
  }

  const waits = reports
    .map((item) => item.waitTimeMinutes)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return {
    locationId,
    level: latest.level,
    estimatedWaitMinutes:
      waits.length > 0 ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length) : undefined,
    reportCount: reports.length,
    confidence: Number(Math.min(1, reports.length / 5).toFixed(2)),
    lastUpdatedAt: latest.reportedAt,
    isStale: Date.now() - latest.reportedAt.getTime() > 30 * 60 * 1000,
  };
};

