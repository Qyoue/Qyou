export type ReportingSource = 'crowd_user' | 'queue_operator' | 'automated_sensor';

export interface RealTimeWaitReport {
  queueId: string;
  reporterUserId: string;
  reportedWaitMinutes: number;
  source: ReportingSource;
  timestamp: string;
}

export interface WaitTimeTrendMetrics {
  queueId: string;
  averageWaitMinutes: number;
  reportsCount: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  confidenceScore: number;
}
