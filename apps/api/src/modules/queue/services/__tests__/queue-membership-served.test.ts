import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QueueMembershipService } from '../queue-membership.service.js';
import { UnifiedIncentiveService } from '../../../../services/unifiedIncentiveService.js';

describe('Queue served flow (#1284)', () => {
  it('calls unified incentive service with idempotency key userId:queueId:event', async () => {
    const incentives = new UnifiedIncentiveService();
    const service = new QueueMembershipService(incentives);

    const first = await service.markServed('queue-1', 'user-1');
    const second = await service.markServed('queue-1', 'user-1');

    assert.equal(first.idempotencyKey, 'user-1:queue-1:queue-served');
    assert.equal(first.processed, true);
    assert.equal(second.processed, false);
  });
});
