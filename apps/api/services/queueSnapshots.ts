import { QueueReport, QueueReportDocument, QueueReportLevel } from '../models/QueueReport';

const STALE_THRESHOLD_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 10;

export type QueueSnapshot = {
  locationId: string;
  level: QueueReportLevel;
  estimatedWaitMinutes?: number;
  reportCount: number;
  confidence: number;
  lastUpdatedAt: Date | null;
  isStale: boolean;
};

const averageWait = (items: QueueReportDocument[]) => {
  const waits = items
    .map((item) => item.waitTimeMinutes)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (waits.length === 0) {
    return undefined;
  }

  return Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length);
};

const inferConfidence = (count: number, latestReportedAt: Date | null) => {
  if (!latestReportedAt) {
    return 0;
  }

  const freshnessPenalty = Date.now() - latestReportedAt.getTime() > STALE_THRESHOLD_MS ? 0.35 : 0;
  const base = Math.min(1, count / 5);
  return Number(Math.max(0, base - freshnessPenalty).toFixed(2));
};

export const buildQueueSnapshot = (params: {
  locationId: string;
  reports: QueueReportDocument[];
}): QueueSnapshot => {
  const latest = params.reports[0];
  const lastUpdatedAt = latest?.reportedAt || null;

  if (!latest) {
    return {
      locationId: params.locationId,
      level: 'unknown',
      estimatedWaitMinutes: undefined,
      reportCount: 0,
      confidence: 0,
      lastUpdatedAt: null,
      isStale: true,
    };
  }

  return {
    locationId: params.locationId,
    level: latest.level,
    estimatedWaitMinutes: averageWait(params.reports),
    reportCount: params.reports.length,
    confidence: inferConfidence(params.reports.length, lastUpdatedAt),
    lastUpdatedAt,
    isStale: Date.now() - lastUpdatedAt.getTime() > STALE_THRESHOLD_MS,
  };
};

export const buildQueueSnapshotForLocation = async (
  locationId: string,
  limit = DEFAULT_LIMIT,
): Promise<QueueSnapshot> => {
  const reports = await QueueReport.find({
    locationId,
    status: 'accepted',
  })
    .sort({ reportedAt: -1 })
    .limit(limit)
    .lean();

  return buildQueueSnapshot({
    locationId,
    reports: reports as QueueReportDocument[],
  });
};

export const QUEUE_SNAPSHOT_RULES = {
  staleThresholdMs: STALE_THRESHOLD_MS,
  defaultLimit: DEFAULT_LIMIT,
} as const;

