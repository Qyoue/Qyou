import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';

describe('API hardening (#1288-#1291)', () => {
  it('exposes liveness endpoint (#1291)', async () => {
    const app = createApp({ authRepository: new InMemoryAuthRepository() });
    const res = await request(app).get('/livez');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('returns 413 for oversized JSON body (#1290)', async () => {
    const app = createApp({ authRepository: new InMemoryAuthRepository() });
    const big = 'a'.repeat(120_000);
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send({ email: 'big@example.com', password: big });
    assert.equal(res.status, 413);
  });
});

  it('applies separate auth rate limits (#1288)', async () => {
    const app = createApp({ authRepository: new InMemoryAuthRepository() });
    let lastStatus = 0;
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `rl-${i}@example.com`, password: 'password123' });
      lastStatus = res.status;
    }
    assert.equal(lastStatus, 429);
  });
