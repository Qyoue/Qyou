/**
 * Structured logger for Stellar SDK interactions and package boundary tracking.
 */

export interface StellarLogEntry {
  timestamp: string;
  operation: string;
  account?: string;
  txHash?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  details?: Record<string, unknown>;
}

export class StellarStructuredLogger {
  private serviceName: string = 'packages/stellar';

  public logInteraction(entry: Omit<StellarLogEntry, 'timestamp'>): void {
    const payload: StellarLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    console.log(JSON.stringify({ service: this.serviceName, ...payload }));
  }

  public logError(operation: string, error: Error, account?: string): void {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      operation,
      account,
      status: 'FAILED',
      errorMessage: error.message,
      stack: error.stack,
    }));
  }
}
