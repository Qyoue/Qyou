/**
 * Distribution Metrics Collector (#1062)
 *
 * Tracks transaction success/failure rates, distribution attempts,
 * and confirmation latencies for Stellar rewards with Prometheus exposition format.
 */

export interface LatencyHistogramStats {
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  readonly avg: number;
  readonly p50: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly buckets: Record<string, number>;
}

export interface DistributionMetricsSnapshot {
  readonly attempts: number;
  readonly successes: number;
  readonly failures: number;
  readonly successRatePercent: number;
  readonly failureRatePercent: number;
  readonly latency: LatencyHistogramStats;
  readonly failuresByReason: Record<string, number>;
  readonly lastUpdated: number;
}

export class DistributionMetricsCollector {
  private static _instance: DistributionMetricsCollector | null = null;

  private _attempts = 0;
  private _successes = 0;
  private _failures = 0;
  private readonly _latencies: number[] = [];
  private readonly _failuresByReason = new Map<string, number>();
  private readonly _bucketThresholds = [50, 100, 250, 500, 1000, 2500, 5000, 10000];

  public static getInstance(): DistributionMetricsCollector {
    if (!this._instance) {
      this._instance = new DistributionMetricsCollector();
    }
    return this._instance;
  }

  /**
   * Resets singleton instance (useful for test isolation).
   */
  public static resetInstance(): void {
    this._instance = null;
  }

  /**
   * Records a reward distribution attempt.
   */
  public recordAttempt(): void {
    this._attempts++;
  }

  /**
   * Records a successful reward distribution along with confirmation latency.
   */
  public recordSuccess(latencyMs: number): void {
    this._successes++;
    if (latencyMs >= 0) {
      this._latencies.push(latencyMs);
    }
  }

  /**
   * Records a failed reward distribution with optional reason and latency.
   */
  public recordFailure(reason = 'unknown', latencyMs?: number): void {
    this._failures++;
    const current = this._failuresByReason.get(reason) || 0;
    this._failuresByReason.set(reason, current + 1);
    if (typeof latencyMs === 'number' && latencyMs >= 0) {
      this._latencies.push(latencyMs);
    }
  }

  /**
   * Computes latency statistics and histogram distribution.
   */
  public getLatencyStats(): LatencyHistogramStats {
    if (this._latencies.length === 0) {
      const emptyBuckets: Record<string, number> = {};
      for (const threshold of this._bucketThresholds) {
        emptyBuckets[`le_${threshold}`] = 0;
      }
      emptyBuckets['le_Inf'] = 0;

      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        buckets: emptyBuckets,
      };
    }

    const sorted = [...this._latencies].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = Math.round((sum / count) * 100) / 100;

    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, Math.min(count - 1, index))];
    };

    const buckets: Record<string, number> = {};
    for (const threshold of this._bucketThresholds) {
      buckets[`le_${threshold}`] = sorted.filter((val) => val <= threshold).length;
    }
    buckets['le_Inf'] = count;

    return {
      count,
      sum,
      min,
      max,
      avg,
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      buckets,
    };
  }

  /**
   * Generates a point-in-time snapshot of distribution metrics.
   */
  public getSnapshot(): DistributionMetricsSnapshot {
    const totalFinished = this._successes + this._failures;
    const successRate = totalFinished > 0 ? (this._successes / totalFinished) * 100 : 100;
    const failureRate = totalFinished > 0 ? (this._failures / totalFinished) * 100 : 0;

    const failuresObj: Record<string, number> = {};
    for (const [reason, cnt] of this._failuresByReason.entries()) {
      failuresObj[reason] = cnt;
    }

    return {
      attempts: this._attempts,
      successes: this._successes,
      failures: this._failures,
      successRatePercent: Math.round(successRate * 100) / 100,
      failureRatePercent: Math.round(failureRate * 100) / 100,
      latency: this.getLatencyStats(),
      failuresByReason: failuresObj,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Formats metrics for Prometheus scraping standard exposition format.
   */
  public toPrometheusFormat(): string {
    const snapshot = this.getSnapshot();
    const lines: string[] = [
      '# HELP stellar_distribution_attempts_total Total number of reward distribution attempts dispatched.',
      '# TYPE stellar_distribution_attempts_total counter',
      `stellar_distribution_attempts_total ${snapshot.attempts}`,
      '',
      '# HELP stellar_distribution_successes_total Total number of successfully confirmed reward distributions.',
      '# TYPE stellar_distribution_successes_total counter',
      `stellar_distribution_successes_total ${snapshot.successes}`,
      '',
      '# HELP stellar_distribution_failures_total Total number of failed reward distributions.',
      '# TYPE stellar_distribution_failures_total counter',
      `stellar_distribution_failures_total ${snapshot.failures}`,
      '',
    ];

    // Failure breakdown by reason
    if (Object.keys(snapshot.failuresByReason).length > 0) {
      lines.push(
        '# HELP stellar_distribution_failures_by_reason Failures partitioned by error reason.',
        '# TYPE stellar_distribution_failures_by_reason counter'
      );
      for (const [reason, count] of Object.entries(snapshot.failuresByReason)) {
        const sanitizedReason = reason.replace(/[^a-zA-Z0-9_]/g, '_');
        lines.push(`stellar_distribution_failures_by_reason{reason="${sanitizedReason}"} ${count}`);
      }
      lines.push('');
    }

    // Latency histogram
    const latency = snapshot.latency;
    lines.push(
      '# HELP stellar_distribution_confirmation_latency_ms Confirmation latency in milliseconds.',
      '# TYPE stellar_distribution_confirmation_latency_ms histogram'
    );
    for (const threshold of this._bucketThresholds) {
      lines.push(
        `stellar_distribution_confirmation_latency_ms_bucket{le="${threshold}"} ${latency.buckets[`le_${threshold}`] || 0}`
      );
    }
    lines.push(
      `stellar_distribution_confirmation_latency_ms_bucket{le="+Inf"} ${latency.buckets['le_Inf'] || 0}`,
      `stellar_distribution_confirmation_latency_ms_sum ${latency.sum}`,
      `stellar_distribution_confirmation_latency_ms_count ${latency.count}`,
      ''
    );

    return lines.join('\n');
  }

  /**
   * Resets all internal metrics state.
   */
  public clear(): void {
    this._attempts = 0;
    this._successes = 0;
    this._failures = 0;
    this._latencies.length = 0;
    this._failuresByReason.clear();
  }
}
