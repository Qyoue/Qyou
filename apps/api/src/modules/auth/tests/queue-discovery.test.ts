import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/qyou_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-32';
process.env.JWT_EXPIRES_IN = '1h';

describe('queue discovery endpoint (#1276)', () => {
  let app: express.Express;
  let utils: any;

  before(async () => {
    const mod = await import('../../queue/routes/queue.routes.js');
    const { errorHandler } = await import('../../../shared/middleware/error-handler.js');
    utils = mod.__queueTestUtils;
    app = express();
    app.use(express.json());
    app.use('/api/v1', mod.createQueueRouter());
    app.use(errorHandler);

    const base = {
      location: { latitude: 0, longitude: 0 },
      currentWaitTimeMinutes: 5,
      activeCount: 1,
    };
    await utils.repo.save({ ...base, id: 'q1', name: 'Alpha Bank', category: 'bank', createdAt: '2026-01-01T00:00:00.000Z' });
    await utils.repo.save({ ...base, id: 'q2', name: 'Beta Hospital', category: 'hospital', createdAt: '2026-01-02T00:00:00.000Z' });
    await utils.repo.save({ ...base, id: 'q3', name: 'Gamma Bank', category: 'bank', createdAt: '2026-01-03T00:00:00.000Z' });
  });

  it('filters by q/category and returns cursor pagination with stable sort', async () => {
    const first = await request(app).get('/api/v1/queues?category=bank&limit=1');
    assert.equal(first.status, 200);
    assert.equal(first.body.data.length, 1);
    assert.equal(first.body.data[0].id, 'q1');
    assert.equal(first.body.pageInfo.nextCursor, 'q1');

    const second = await request(app).get('/api/v1/queues?category=bank&limit=1&cursor=q1');
    assert.equal(second.status, 200);
    assert.equal(second.body.data[0].id, 'q3');
    assert.equal(second.body.pageInfo.nextCursor, null);

    const search = await request(app).get('/api/v1/queues?q=beta');
    assert.equal(search.status, 200);
    assert.equal(search.body.data.length, 1);
    assert.equal(search.body.data[0].id, 'q2');
  });
});
