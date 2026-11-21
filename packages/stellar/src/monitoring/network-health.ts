/**
 * Stellar Upstream Network Health Monitor (#1064)
 *
 * Tracks response latencies and error rates for upstream Horizon and Soroban RPC endpoints
 * to isolate whether reward processing issues stem from local application logic or network conditions.
 */

export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface EndpointMetricSample {
  readonly timestamp: number;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly statusCode?: number;
  readonly error?: string;
}

export interface EndpointHealthSummary {
  readonly endpointType: 'horizon' | 'soroban';
  readonly url: string;
  readonly status: ServiceHealthStatus;
  readonly sampleCount: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly errorRatePercent: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly lastCheckedAt: number | null;
  readonly lastError?: string;
}

export interface NetworkHealthSnapshot {
  readonly overallStatus: ServiceHealthStatus;
  readonly horizon: EndpointHealthSummary;
  readonly soroban: EndpointHealthSummary;
  readonly evaluatedAt: number;
}

export class NetworkHealthTracker {
  private static _instance: NetworkHealthTracker | null = null;

  private readonly _horizonUrl: string;
  private readonly _sorobanUrl: string;
  private readonly _horizonSamples: EndpointMetricSample[] = [];
  private readonly _sorobanSamples: EndpointMetricSample[] = [];
  private readonly _maxSamples = 100;

  constructor(options: { horizonUrl?: string; sorobanUrl?: string } = {}) {
    this._horizonUrl = options.horizonUrl || 'https://horizon-testnet.stellar.org';
    this._sorobanUrl = options.sorobanUrl || 'https://soroban-testnet.stellar.org';
  }

  public static getInstance(): NetworkHealthTracker {
    if (!this._instance) {
      this._instance = new NetworkHealthTracker();
    }
    return this._instance;
  }

  public static resetInstance(): void {
    this._instance = null;
  }

  /**
   * Records a probe sample for Horizon endpoint.
   */
  public recordHorizonSample(sample: Omit<EndpointMetricSample, 'timestamp'>): void {
    this._horizonSamples.push({
      ...sample,
      timestamp: Date.now(),
    });
    if (this._horizonSamples.length > this._maxSamples) {
      this._horizonSamples.shift();
    }
  }

  /**
   * Records a probe sample for Soroban RPC endpoint.
   */
  public recordSorobanSample(sample: Omit<EndpointMetricSample, 'timestamp'>): void {
    this._sorobanSamples.push({
      ...sample,
      timestamp: Date.now(),
    });
    if (this._sorobanSamples.length > this._maxSamples) {
      this._sorobanSamples.shift();
    }
  }

  private summarizeSamples(
    endpointType: 'horizon' | 'soroban',
    url: string,
    samples: readonly EndpointMetricSample[]
  ): EndpointHealthSummary {
    if (samples.length === 0) {
      return {
        endpointType,
        url,
        status: 'unknown',
        sampleCount: 0,
        successCount: 0,
        errorCount: 0,
        errorRatePercent: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        lastCheckedAt: null,
      };
    }

    const sampleCount = samples.length;
    const successCount = samples.filter((s) => s.success).length;
    const errorCount = sampleCount - successCount;
    const errorRatePercent = Math.round((errorCount / sampleCount) * 1000) / 10;

    const latencies = samples.map((s) => s.latencyMs).sort((a, b) => a - b);
    const sum = latencies.reduce((acc, l) => acc + l, 0);
    const avgLatencyMs = Math.round(sum / sampleCount);

    const p95Index = Math.ceil(0.95 * sampleCount) - 1;
    const p95LatencyMs = latencies[Math.max(0, Math.min(sampleCount - 1, p95Index))];

    const lastSample = samples[samples.length - 1];
    const lastCheckedAt = lastSample.timestamp;
    const lastError = !lastSample.success ? lastSample.error : undefined;

    // Status evaluation heuristics:
    // Unhealthy: errorRate >= 25% OR avgLatency > 4000ms
    // Degraded: errorRate >= 5% OR avgLatency > 1200ms
    // Healthy: otherwise
    let status: ServiceHealthStatus = 'healthy';
    if (errorRatePercent >= 25 || avgLatencyMs > 4000) {
      status = 'unhealthy';
    } else if (errorRatePercent >= 5 || avgLatencyMs > 1200) {
      status = 'degraded';
    }

    return {
      endpointType,
      url,
      status,
      sampleCount,
      successCount,
      errorCount,
      errorRatePercent,
      avgLatencyMs,
      p95LatencyMs,
      lastCheckedAt,
      lastError,
    };
  }

  /**
   * Generates a complete health snapshot across Horizon and Soroban RPC.
   */
  public getSnapshot(): NetworkHealthSnapshot {
    const horizonSummary = this.summarizeSamples('horizon', this._horizonUrl, this._horizonSamples);
    const sorobanSummary = this.summarizeSamples('soroban', this._sorobanUrl, this._sorobanSamples);

    let overallStatus: ServiceHealthStatus = 'healthy';
    if (horizonSummary.status === 'unhealthy' || sorobanSummary.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (horizonSummary.status === 'degraded' || sorobanSummary.status === 'degraded') {
      overallStatus = 'degraded';
    } else if (horizonSummary.status === 'unknown' && sorobanSummary.status === 'unknown') {
      overallStatus = 'unknown';
    }

    return {
      overallStatus,
      horizon: horizonSummary,
      soroban: sorobanSummary,
      evaluatedAt: Date.now(),
    };
  }

  public clear(): void {
    this._horizonSamples.length = 0;
    this._sorobanSamples.length = 0;
  }
}
