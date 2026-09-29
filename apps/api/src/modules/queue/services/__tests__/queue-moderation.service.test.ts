import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QueueModerationService } from '../queue-moderation.service.js';

describe('QueueModerationService', () => {
  const service = new QueueModerationService();

  it('records a moderation action with a timestamp', async () => {
    const record = await service.applyModeration({
      queueId: 'q1',
      operatorId: 'op-1',
      action: 'pause',
      reason: 'incident',
    });

    assert.equal(record.queueId, 'q1');
    assert.equal(record.action, 'pause');
    assert.ok(record.timestamp);
  });

  it('filters audit logs by queue and ignores unrelated queues', async () => {
    await service.applyModeration({ queueId: 'q1', operatorId: 'op-1', action: 'resume' });
    await service.applyModeration({ queueId: 'q2', operatorId: 'op-1', action: 'flag' });

    const logs = service.getLogsForQueue('q1');
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'resume');
  });

  it('returns an empty audit log for a queue with no actions', () => {
    assert.deepEqual(service.getLogsForQueue('q-unknown'), []);
  });
});
