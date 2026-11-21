import { describe, it, expect } from 'vitest';
import { QUEUE_MEMBERSHIP_PHASE2_CONTRACT, validateQueueMembershipPhase2 } from '../queue-membership-phase2-contract';

describe('Queue Creation & Membership Phase 2', () => {
  it('validates Phase 2 queue membership contract without errors', () => {
    const errors = validateQueueMembershipPhase2(QUEUE_MEMBERSHIP_PHASE2_CONTRACT);
    expect(errors).toHaveLength(0);
  });

  it('verifies observability metrics and persistence configuration', () => {
    expect(QUEUE_MEMBERSHIP_PHASE2_CONTRACT.observabilityMetrics).toContain('queue_member_join_total');
    expect(QUEUE_MEMBERSHIP_PHASE2_CONTRACT.persistence.tableName).toBe('queue_membership');
  });
});
