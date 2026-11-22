import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QueueMembershipService } from '../queue-membership.service.js';

describe('QueueMembershipService position compaction (#1280)', () => {
  it('compacts positions after leave', async () => {
    const svc = new QueueMembershipService();
    await svc.joinQueue({ queueId: 'q1', userId: 'u1', role: 'member' });
    await svc.joinQueue({ queueId: 'q1', userId: 'u2', role: 'member' });
    await svc.joinQueue({ queueId: 'q1', userId: 'u3', role: 'member' });

    const afterLeave = svc.leaveQueue('q1', 'u2');
    assert.deepEqual(afterLeave.map((m) => [m.userId, m.positionNumber]), [
      ['u1', 1],
      ['u3', 2],
    ]);
  });

  it('compacts positions after skip (moves to end)', async () => {
    const svc = new QueueMembershipService();
    await svc.joinQueue({ queueId: 'q1', userId: 'u1', role: 'member' });
    await svc.joinQueue({ queueId: 'q1', userId: 'u2', role: 'member' });
    await svc.joinQueue({ queueId: 'q1', userId: 'u3', role: 'member' });

    const afterSkip = svc.skipQueue('q1', 'u1');
    assert.deepEqual(afterSkip.map((m) => [m.userId, m.positionNumber]), [
      ['u2', 1],
      ['u3', 2],
      ['u1', 3],
    ]);
  });

  it('property-style: positions are always contiguous 1..n after random leave/skip ops', async () => {
    const svc = new QueueMembershipService();
    const queueId = 'q-prop';
    const users = Array.from({ length: 8 }, (_, i) => `u${i + 1}`);
    for (const userId of users) {
      await svc.joinQueue({ queueId, userId, role: 'member' });
    }

    // deterministic pseudo-random sequence
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 30; i++) {
      const members = svc.getMembers(queueId);
      if (members.length === 0) break;
      const pick = members[Math.floor(rand() * members.length)];
      if (rand() < 0.5) {
        svc.leaveQueue(queueId, pick.userId);
      } else {
        svc.skipQueue(queueId, pick.userId);
      }
      const after = svc.getMembers(queueId);
      const positions = after.map((m) => m.positionNumber);
      const expected = Array.from({ length: after.length }, (_, idx) => idx + 1);
      assert.deepEqual(positions, expected, `contiguous positions after op ${i}`);
      const ids = new Set(after.map((m) => m.userId));
      assert.equal(ids.size, after.length, 'no duplicate members');
    }
  });

  it('leave on unknown user is a no-op compaction', async () => {
    const svc = new QueueMembershipService();
    await svc.joinQueue({ queueId: 'q1', userId: 'u1', role: 'member' });
    const after = svc.leaveQueue('q1', 'missing');
    assert.deepEqual(after.map((m) => [m.userId, m.positionNumber]), [['u1', 1]]);
  });
});
