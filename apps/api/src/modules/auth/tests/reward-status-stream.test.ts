import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/qyou_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-32';
process.env.JWT_EXPIRES_IN = '1h';

function tokenFor(userId: string, email = `${userId}@example.com`, role = 'USER') {
  return jwt.sign({ sub: userId, email, role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

async function readSseChunk(url: string, headers: Record<string, string>, ms = 300): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    assert.equal(res.status, 200);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.includes(': heartbeat') || text.split('\n\n').filter(Boolean).length >= 2) break;
    }
    controller.abort();
    return text;
  } finally {
    clearTimeout(timer);
  }
}

describe('reward status SSE (#1283)', () => {
  let server: http.Server;
  let baseUrl: string;
  let mod: typeof import('../../../events/rewardStatusStream.js');

  before(async () => {
    mod = await import('../../../events/rewardStatusStream.js');
    const { errorHandler } = await import('../../../shared/middleware/error-handler.js');
    const app = express();
    app.use('/api/v1', mod.setupRewardSseStream({ heartbeatMs: 50 }));
    app.use(errorHandler);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(() => {
    mod.resetRewardStreamForTests();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/v1/rewards/stream`);
    assert.equal(res.status, 401);
  });

  it('replays only events for the authenticated user and honors Last-Event-ID', async () => {
    mod.publishRewardEvent('u1', { status: 'pending', rewardId: 'r1' });
    mod.publishRewardEvent('u2', { status: 'pending', rewardId: 'r2' });
    mod.publishRewardEvent('u1', { status: 'confirmed', rewardId: 'r1' });

    const text = await readSseChunk(`${baseUrl}/api/v1/rewards/stream`, {
      Authorization: `Bearer ${tokenFor('u1')}`,
      'Last-Event-ID': '1',
    });

    assert.match(text, /"rewardId":"r1"/);
    assert.match(text, /"status":"confirmed"/);
    assert.doesNotMatch(text, /"rewardId":"r2"/);
    // event id 1 should be skipped
    assert.doesNotMatch(text, /id: 1\n/);
  });

  it('emits heartbeat', async () => {
    const text = await readSseChunk(`${baseUrl}/api/v1/rewards/stream`, {
      Authorization: `Bearer ${tokenFor('u3')}`,
    }, 500);
    assert.match(text, /: heartbeat/);
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
