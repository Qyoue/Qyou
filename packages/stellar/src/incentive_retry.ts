/**
 * Failure handling, exponential backoff retry policy, and IncentivePool contract interface.
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export class IncentiveRetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelayMs: config.initialDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 10000,
      backoffFactor: config.backoffFactor ?? 2,
    };
  }

  public async executeWithRetry<T>(fn: () => Promise<T>, opName: string): Promise<T> {
    let attempt = 0;
    let delay = this.config.initialDelayMs;

    while (attempt < this.config.maxRetries) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt >= this.config.maxRetries) {
          throw new Error(`Operation ${opName} failed after ${attempt} attempts: ${(err as Error).message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * this.config.backoffFactor, this.config.maxDelayMs);
      }
    }
    throw new Error(`Operation ${opName} exhausted retries`);
  }
}

export interface IncentivePoolSpec {
  poolContractId: string;
  reserveBalance: bigint;
  rewardAsset: string;
}
