/**
 * Idempotency key validation and transaction confirmation polling helpers.
 */

export class IdempotentIncentiveValidator {
  private processedKeys = new Map<string, { txHash: string; timestamp: number }>();

  public isAlreadyProcessed(idempotencyKey: string): boolean {
    return this.processedKeys.has(idempotencyKey);
  }

  public markProcessed(idempotencyKey: string, txHash: string): void {
    this.processedKeys.set(idempotencyKey, {
      txHash,
      timestamp: Date.now(),
    });
  }

  public getTransaction(idempotencyKey: string) {
    return this.processedKeys.get(idempotencyKey);
  }
}

export class TransactionPollingService {
  public async pollConfirmation(
    txHash: string,
    checkStatusFn: (hash: string) => Promise<boolean>,
    timeoutMs: number = 30000,
    intervalMs: number = 2000
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const isConfirmed = await checkStatusFn(txHash);
      if (isConfirmed) return true;
      await new Promise(res => setTimeout(res, intervalMs));
    }
    return false;
  }
}
