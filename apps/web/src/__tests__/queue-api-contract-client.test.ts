/**
 * Contract test for queue-api-contract-client.ts (#833).
 *
 * Until the backend queue API ships (see API issue #3), this test acts as
 * a living record of the expected routes and response shapes. Once
 * `openapi.yaml` (or equivalent) exists, replace the stubs below with
 * real schema-validation assertions.
 *
 * If the backend routes change, this file must be updated — making the
 * mismatch visible in CI rather than silent at runtime.
 */

import { unwrapQueueApiResponse } from '../../../lib/queue-api-contract-client';
import type { QueueApiEnvelope } from '@qyou/shared';

describe('unwrapQueueApiResponse', () => {
  it('returns data from a successful envelope', () => {
    const envelope: QueueApiEnvelope<{ id: string }> = {
      success: true,
      data: { id: 'q-1' },
    };
    expect(unwrapQueueApiResponse(envelope)).toEqual({ id: 'q-1' });
  });

  it('throws with error code when success=false', () => {
    const envelope: QueueApiEnvelope<never> = {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Queue not found' },
    };
    expect(() => unwrapQueueApiResponse(envelope)).toThrow('[NOT_FOUND] Queue not found');
  });

  it('throws when data is missing from a successful envelope', () => {
    const envelope = { success: true } as QueueApiEnvelope<string>;
    expect(() => unwrapQueueApiResponse(envelope)).toThrow('no payload data');
  });

  it('listQueues unwraps queue API envelope (#1298)', async () => {
    jest.resetModules();
    jest.doMock('../lib/api-client', () => ({
      getJson: jest.fn().mockResolvedValue({ success: true, data: [{ id: 'q1', name: 'Q', category: 'bank', location: { latitude: 0, longitude: 0 }, currentWaitTimeMinutes: 1, activeCount: 1, createdAt: '2026-01-01T00:00:00.000Z' }] }),
    }));
    const { listQueues } = await import('../lib/queue-api-contract-client');
    const queues = await listQueues();
    expect(queues).toHaveLength(1);
    expect(queues[0].id).toBe('q1');
  });
});
