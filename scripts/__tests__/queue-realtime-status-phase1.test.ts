import { describe, it, expect } from 'vitest';
import { QUEUE_REALTIME_STATUS_CONTRACT, validateQueueRealtimeStatus } from '../queue-realtime-status-contract-phase1';

describe('Queue Real-time Status & Wait Time Reporting Contract', () => {
  it('validates queue real-time status contract with 0 errors', () => {
    const errors = validateQueueRealtimeStatus(QUEUE_REALTIME_STATUS_CONTRACT);
    expect(errors).toHaveLength(0);
  });

  it('covers edge cases strategy for zero members and offline fallback', () => {
    expect(QUEUE_REALTIME_STATUS_CONTRACT.edgeCaseHandling.zeroMembersStrategy).toBe('return_default_estimate');
    expect(QUEUE_REALTIME_STATUS_CONTRACT.edgeCaseHandling.serverOfflineFallback).toBe('cached_snapshot');
  });
});
