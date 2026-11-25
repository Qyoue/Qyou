import './helpers/test-env.js';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';
import type { Express } from 'express';

describe('Auth session lifecycle E2E (HTTP)', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp({ authRepository: new InMemoryAuthRepository() });
  });

  it('creates a session on login over HTTP', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'e2e-session@example.com', password: 'Password123' })
      .expect(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e-session@example.com', password: 'Password123' })
      .expect(200);

    assert.ok(login.body.tokens.accessToken, 'login should return an access token');
  });

  it('invalidates the session on logout over HTTP', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'e2e-logout@example.com', password: 'Password123' });

    const logout = await request(app).post('/api/auth/logout').expect(200);
    assert.equal(logout.body.message, 'Logged out successfully');
  });

  it('rotates tokens during session refresh over HTTP', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'e2e-refresh@example.com', password: 'Password123' })
      .expect(201);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e-refresh@example.com', password: 'Password123' })
      .expect(200);
    const originalRefreshToken = login.body.tokens.refreshToken as string;
    assert.ok(originalRefreshToken, 'login should return a refresh token');

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefreshToken })
      .expect(200);
    assert.ok(refreshed.body.tokens.accessToken);
    assert.notEqual(refreshed.body.tokens.refreshToken, originalRefreshToken);

    const rotated = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshed.body.tokens.refreshToken })
      .expect(200);
    assert.ok(rotated.body.tokens.accessToken);

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefreshToken })
      .expect(401);
  });

  it('validates a session over HTTP', { todo: 'session validation HTTP route is not implemented yet (#814)' }, () => {});
});
