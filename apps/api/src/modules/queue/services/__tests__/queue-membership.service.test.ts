import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QueueMembershipService } from '../queue-membership.service.js';

describe('QueueMembershipService', () => {
  const service = new QueueMembershipService();

  it('adds a member to an empty queue at position 1', async () => {
    const record = await service.joinQueue({ queueId: 'q1', userId: 'u1' });

    assert.equal(record.queueId, 'q1');
    assert.equal(record.userId, 'u1');
    assert.equal(record.positionNumber, 1);
    assert.equal(record.role, 'member');
  });

  it('rejects a duplicate membership', async () => {
    await service.joinQueue({ queueId: 'q2', userId: 'u1' });

    await assert.rejects(
      () => service.joinQueue({ queueId: 'q2', userId: 'u1' }),
      /already a member/,
    );
  });

  it('flags duplicate and over-capacity joins via edge-case validation', async () => {
    await service.joinQueue({ queueId: 'q3', userId: 'u1' });

    const duplicate = service.validateJoinEdgeCases('q3', 'u1');
    assert.equal(duplicate.isPermitted, false);
    assert.equal(duplicate.duplicateDetected, true);

    const overCapacity = service.validateJoinEdgeCases('q3', 'u2', 1);
    assert.equal(overCapacity.isPermitted, false);
    assert.equal(overCapacity.capacityExceeded, true);
  });
});
