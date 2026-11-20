process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars-long!';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { RewardRecord } from '@qyou/stellar';

import { createStellarRouter } from '../routes/stellar.routes.js';
import { InMemoryStellarRepository } from '../repositories/stellar.repository.js';
import { StellarApiService } from '../services/stellar.service.js';
import { errorHandler } from '../../../shared/middleware/error-handler.js';

const KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
const token = (userId: string, iatSecondsAgo = 0) =>
  jwt.sign(
    { sub: userId, email: `${userId}@x.test`, iat: Math.floor(Date.now() / 1000) - iatSecondsAgo },
    process.env.JWT_SECRET!,
  );

const reward = (id: string, userId: string, createdAt: number): RewardRecord =>
  ({ id, userId, queueId: `q-${id}`, recipient: KEY, amount: '5', asset: 'QYOU', status: 'confirmed', createdAt }) as RewardRecord;

function app(opts: { rewards?: RewardRecord[]; rateLimit?: { windowMs: number; perUser: number; perIp: number }; unlinkReauthMinutes?: number } = {}) {
  const repo = new InMemoryStellarRepository();
  const service = new StellarApiService(repo, undefined, { getUserRewards: (u) => (opts.rewards ?? []).filter((r) => r.userId === u) });
  const router = createStellarRouter({
    stellarRepository: repo,
    stellarService: service,
    rateLimit: opts.rateLimit,
    unlinkReauthMinutes: opts.unlinkReauthMinutes,
  });
  const a = express();
  a.use(express.json());
  a.use('/api/v1/stellar', router);
  a.use(errorHandler);
  return a;
}

describe('GET /api/v1/stellar/rewards (#1363)', () => {
  it('requires authentication', async () => {
    const res = await request(app()).get('/api/v1/stellar/rewards');
    assert.equal(res.status, 401);
  });

  it('returns only the caller\'s rewards, newest first, without internal fields', async () => {
    const a = app({ rewards: [reward('1', 'u1', 1000), reward('2', 'u1', 3000), reward('3', 'u2', 2000)] });
    const res = await request(a).get('/api/v1/stellar/rewards').set('Authorization', `Bearer ${token('u1')}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.rewards.map((r: { id: string }) => r.id), ['2', '1']);
    assert.equal(res.body.nextCursor, null);
    assert.equal('recipient' in res.body.rewards[0], false);
  });

  it('paginates with limit and cursor', async () => {
    const rewards = [1, 2, 3].map((n) => reward(String(n), 'u1', n * 1000));
    const a = app({ rewards });
    const first = await request(a).get('/api/v1/stellar/rewards?limit=2').set('Authorization', `Bearer ${token('u1')}`);
    assert.equal(first.body.rewards.length, 2);
    assert.equal(first.body.nextCursor, '2');
    const second = await request(a).get('/api/v1/stellar/rewards?limit=2&cursor=2').set('Authorization', `Bearer ${token('u1')}`);
    assert.deepEqual(second.body.rewards.map((r: { id: string }) => r.id), ['1']);
    assert.equal(second.body.nextCursor, null);
  });

  it('rejects an invalid limit or cursor', async () => {
    const a = app();
    for (const q of ['limit=0', 'limit=101', 'limit=x', 'cursor=-1']) {
      const res = await request(a).get(`/api/v1/stellar/rewards?${q}`).set('Authorization', `Bearer ${token('u1')}`);
      assert.equal(res.status, 400, q);
    }
  });
});

describe('stellar-hardening is applied by createStellarRouter (#1362)', () => {
  it('rate limits wallet linking per user', async () => {
    const a = app({ rateLimit: { windowMs: 60_000, perUser: 2, perIp: 100 } });
    const post = () =>
      request(a).post('/api/v1/stellar/wallet').set('Authorization', `Bearer ${token('u9')}`).send({ publicKey: KEY });
    await post();
    await post();
    const third = await post();
    assert.equal(third.status, 429);
  });

  it('requires a recent authentication to unlink a wallet', async () => {
    const a = app({ unlinkReauthMinutes: 15 });
    const stale = await request(a)
      .delete('/api/v1/stellar/wallet')
      .set('Authorization', `Bearer ${token('u1', 60 * 60)}`)
      .send({ confirm: true });
    assert.equal(stale.status, 401);
    assert.equal(stale.body.error, 'Re-authentication required');
  });
});

describe('createStellarRouter in production-like environments (#1360)', () => {
  it('refuses the default in-memory repository in production and staging', () => {
    const previous = process.env.NODE_ENV;
    try {
      for (const env of ['production', 'staging']) {
        process.env.NODE_ENV = env;
        assert.throws(() => createStellarRouter(), /refusing the in-memory repository/);
      }
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
