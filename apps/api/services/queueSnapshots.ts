import { QueueReport, QueueReportDocument, QueueReportLevel } from '../models/QueueReport';

const STALE_THRESHOLD_MS = 30 * 60 * 1000;

export type QueueSnapshot = {
  locationId: string;
  level: QueueReportLevel;
  estimatedWaitMinutes?: number;
  reportCount: number;
  confidence: number;
  lastUpdatedAt: Date | null;
  isStale: boolean;
};

const averageWait = (reports: QueueReportDocument[]) => {
  const waits = reports
    .map((item) => item.waitTimeMinutes)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (waits.length === 0) {
    return undefined;
  }

  return Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length);
};

export const buildQueueSnapshotForLocation = async (locationId: string): Promise<QueueSnapshot> => {
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
      level: 'unknown',
      estimatedWaitMinutes: undefined,
      reportCount: 0,
      confidence: 0,
      lastUpdatedAt: null,
      isStale: true,
    };
  }

  const isStale = Date.now() - latest.reportedAt.getTime() > STALE_THRESHOLD_MS;

  return {
    locationId,
    level: latest.level,
    estimatedWaitMinutes: averageWait(reports),
    reportCount: reports.length,
    confidence: Number(Math.min(1, reports.length / 5).toFixed(2)),
    lastUpdatedAt: latest.reportedAt,
    isStale,
  };
};

