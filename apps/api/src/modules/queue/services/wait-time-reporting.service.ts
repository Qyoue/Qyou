import {
  realTimeWaitReportSchema,
  type RealTimeWaitReport,
  type RealTimeWaitReportInput,
  type WaitTimeTrendMetrics,
} from '@qyou/shared';

// #822: Concurrency model — this service uses an in-memory Map; concurrent
// join/leave events are serialised by Node's single-threaded event loop so
// no explicit locking is required. If the repository is replaced with a
// real DB, use a transaction or optimistic locking to prevent count drift.
export class WaitTimeReportingService {
  private readonly reports: Map<string, RealTimeWaitReport[]> = new Map();

  public async submitReport(userId: string, input: RealTimeWaitReportInput): Promise<RealTimeWaitReport> {
    const validated = realTimeWaitReportSchema.parse(input);
    const report: RealTimeWaitReport = {
      queueId: validated.queueId,
      reporterUserId: userId,
      reportedWaitMinutes: validated.reportedWaitMinutes,
      source: validated.source,
      timestamp: new Date().toISOString(),
    };

    const existing = this.reports.get(validated.queueId) ?? [];
    existing.push(report);
    this.reports.set(validated.queueId, existing);
    return report;
  }

  public calculateMetrics(queueId: string): WaitTimeTrendMetrics {
    const list = this.reports.get(queueId) ?? [];
    if (list.length === 0) {
      return { queueId, averageWaitMinutes: 0, reportsCount: 0, trend: 'stable', confidenceScore: 0 };
    }

    const total = list.reduce((acc, r) => acc + r.reportedWaitMinutes, 0);
    const avg = Math.round(total / list.length);
    const confidenceScore = Math.min(list.length * 20, 100);

    return {
      queueId,
      averageWaitMinutes: avg,
      reportsCount: list.length,
      trend: 'stable',
      confidenceScore,
    };
  }
}
