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

  it('200 parallel joins produce consistent positions with no duplicates (#1279)', async () => {
    const svc = new QueueMembershipService();
    const queueId = 'q-concurrent';
    const joins = Array.from({ length: 200 }, (_, i) =>
      svc.joinQueue({ queueId, userId: `u-${i + 1}`, role: 'member' }),
    );
    const records = await Promise.all(joins);
    const positions = records.map((r) => r.positionNumber).sort((a, b) => a - b);
    const expected = Array.from({ length: 200 }, (_, i) => i + 1);
    assert.deepEqual(positions, expected);
    assert.equal(new Set(records.map((r) => r.userId)).size, 200);
  });
});
