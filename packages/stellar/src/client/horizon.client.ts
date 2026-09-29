// packages/stellar/src/client/horizon.client.ts
import { Server } from '@stellar/stellar-sdk';

export interface HorizonClientConfig {
    horizonUrl: string;
    timeoutMs?: number;
    maxRetries?: number;
    initialBackoffMs?: number;
}

export class HorizonClientWrapper {
    public readonly server: Server;
    private maxRetries: number;
    private initialBackoffMs: number;

    constructor(config: HorizonClientConfig) {
        const timeout = config.timeoutMs || 10000;
        this.server = new Server(config.horizonUrl, {
            // Stellar SDK Server constructor accepts custom opts / timeout where applicable
        });
        // Set custom timeout on underlying Axios client if present
        if ((this.server as any).axios) {
            (this.server as any).axios.defaults.timeout = timeout;
        }

        this.maxRetries = config.maxRetries ?? 3;
        this.initialBackoffMs = config.initialBackoffMs ?? 500;
    }

    /**
     * Executes a Horizon API call with exponential backoff and retry logic for transient failures.
     */
    public async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
        let attempt = 0;
        let backoff = this.initialBackoffMs;

        while (true) {
            try {
                return await operation();
            } catch (error: any) {
                attempt++;
                // Do not retry client-side 4xx errors (except 429 rate limit)
                const status = error?.response?.status || error?.status;
                const isRateLimit = status === 429;
                const isClientError = status >= 400 && status < 500 && !isRateLimit;

                if (attempt > this.maxRetries || isClientError) {
                    throw error;
                }

                // Wait with exponential backoff and jitter
                const jitter = Math.random() * 100;
                await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
                backoff *= 2; // Exponential increase
            }
        }
    }

    public async getAccount(accountId: string) {
        return this.executeWithRetry(() => this.server.loadAccount(accountId));
    }

    public async getTransaction(transactionHash: string) {
        return this.executeWithRetry(() => this.server.transactions().transaction(transactionHash).call());
    }
}