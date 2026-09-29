// packages/stellar/src/client/__tests__/horizon.client.spec.ts
import { HorizonClientWrapper } from '../horizon.client';

describe('HorizonClientWrapper (#953)', () => {
    it('should retry transient failures and succeed on subsequent attempt', async () => {
        const client = new HorizonClientWrapper({
            horizonUrl: 'https://horizon-testnet.stellar.org',
            maxRetries: 3,
            initialBackoffMs: 10,
        });

        let attempts = 0;
        const mockOperation = jest.fn().mockImplementation(async () => {
            attempts++;
            if (attempts < 3) {
                const err: any = new Error('Gateway Timeout');
                err.status = 504;
                throw err;
            }
            return { id: 'tx_success_123' };
        });

        const result = await client.executeWithRetry(mockOperation);

        expect(result).toEqual({ id: 'tx_success_123' });
        expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry client-side 4xx errors (e.g. 404 Not Found)', async () => {
        const client = new HorizonClientWrapper({
            horizonUrl: 'https://horizon-testnet.stellar.org',
            maxRetries: 3,
            initialBackoffMs: 10,
        });

        const mockOperation = jest.fn().mockImplementation(async () => {
            const err: any = new Error('Not Found');
            err.status = 404;
            throw err;
        });

        await expect(client.executeWithRetry(mockOperation)).rejects.toThrow('Not Found');
        expect(mockOperation).toHaveBeenCalledTimes(1);
    });
});