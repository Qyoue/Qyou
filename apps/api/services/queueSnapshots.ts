import { QueueReport } from '../models/QueueReport';

export const buildQueueSnapshotForLocation = async (locationId: string) => {
  const items = await QueueReport.find({
    locationId,
    status: 'accepted',
  })
    .sort({ reportedAt: -1 })
    .limit(10)
    .lean();

  if (items.length === 0) {
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

  const latest = items[0];
  const waitSamples = items
    .map((item) => item.waitTimeMinutes)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const estimatedWaitMinutes =
    waitSamples.length > 0
      ? Math.round(waitSamples.reduce((sum, value) => sum + value, 0) / waitSamples.length)
      : undefined;

  const ageMs = Date.now() - latest.reportedAt.getTime();
  const isStale = ageMs > 30 * 60 * 1000;
  const confidence = Math.min(1, items.length / 5);

  return {
    locationId,
    level: latest.level,
    estimatedWaitMinutes,
    reportCount: items.length,
    confidence: Number(confidence.toFixed(2)),
    lastUpdatedAt: latest.reportedAt,
    isStale,
  };
};

