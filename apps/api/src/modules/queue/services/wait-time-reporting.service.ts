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

  public getReports(queueId: string): RealTimeWaitReport[] {
    return [...(this.reports.get(queueId) ?? [])];
  }

  public calculateMetrics(queueId: string): WaitTimeTrendMetrics {
    const list = this.reports.get(queueId) ?? [];
    if (list.length === 0) {
      return { queueId, averageWaitMinutes: 0, reportsCount: 0, trend: 'stable', confidenceScore: 0 };
    }

    const filtered = this.rejectOutliers(list.map((r) => r.reportedWaitMinutes));
    const values = filtered.length > 0 ? filtered : list.map((r) => r.reportedWaitMinutes);
    const total = values.reduce((acc, v) => acc + v, 0);
    const avg = Math.round(total / values.length);
    const confidenceScore = Math.min(values.length * 20, 100);

    return {
      queueId,
      averageWaitMinutes: avg,
      reportsCount: values.length,
      trend: 'stable',
      confidenceScore,
    };
  }

  private rejectOutliers(values: number[]): number[] {
    if (values.length < 4) return values;
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
    const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
    const iqr = q3 - q1;
    if (iqr === 0) return values;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    return values.filter((v) => v >= lower && v <= upper);
  }
}
