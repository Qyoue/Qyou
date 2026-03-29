import { QueueReport, QueueReportDocument } from '../models/QueueReport';

export type QueueTrend = 'up' | 'down' | 'flat' | 'unknown';

export type QueueHistoryPoint = {
  at: Date;
  level: QueueReportDocument['level'];
  waitTimeMinutes?: number;
};

export type QueueHistoryResult = {
  locationId: string;
  windowStart: Date;
  windowEnd: Date;
  points: QueueHistoryPoint[];
  trend: QueueTrend;
};

const LEVEL_WEIGHT: Record<QueueReportDocument['level'], number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  unknown: 1.5,
};

const computeAverageSignal = (points: QueueHistoryPoint[]) => {
  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => {
    if (typeof point.waitTimeMinutes === 'number' && Number.isFinite(point.waitTimeMinutes)) {
      return point.waitTimeMinutes;
    }
    return LEVEL_WEIGHT[point.level] * 10;
  });

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const computeTrend = (points: QueueHistoryPoint[]): QueueTrend => {
  if (points.length < 2) {
    return 'unknown';
  }

  const midpoint = Math.ceil(points.length / 2);
  const firstHalf = computeAverageSignal(points.slice(0, midpoint));
  const secondHalf = computeAverageSignal(points.slice(midpoint));

  if (firstHalf === null || secondHalf === null) {
    return 'unknown';
  }

  const delta = secondHalf - firstHalf;
  if (Math.abs(delta) < 3) {
    return 'flat';
  }

  return delta > 0 ? 'up' : 'down';
};

export const getQueueHistoryForLocation = async (params: {
  locationId: string;
  windowHours?: number;
  limit?: number;
}): Promise<QueueHistoryResult> => {
  const windowHours = Number.isFinite(params.windowHours) ? Math.max(1, Math.floor(params.windowHours || 6)) : 6;
  const limit = Number.isFinite(params.limit) ? Math.min(200, Math.max(1, Math.floor(params.limit || 24))) : 24;

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);

  const reports = (await QueueReport.find({
    locationId: params.locationId,
    status: 'accepted',
    reportedAt: { $gte: windowStart, $lte: windowEnd },
  })
    .sort({ reportedAt: 1 })
    .limit(limit)
    .lean()) as QueueReportDocument[];

  const points = reports.map((report) => ({
    at: report.reportedAt,
    level: report.level,
    waitTimeMinutes: report.waitTimeMinutes,
  }));

  return {
    locationId: params.locationId,
    windowStart,
    windowEnd,
    points,
    trend: computeTrend(points),
  };
};

