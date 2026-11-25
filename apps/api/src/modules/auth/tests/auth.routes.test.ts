import './helpers/test-env.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { env } from '../../../shared/config/env.js';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';
import type { Express } from 'express';

describe('Auth routes', () => {
  let app: Express;
  let authRepository: InMemoryAuthRepository;

  beforeEach(() => {
    authRepository = new InMemoryAuthRepository();
    app = createApp({ authRepository });
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'register@example.com', password: 'Password123' });

      assert.equal(response.status, 201);
      assert.equal(response.body.user.email, 'register@example.com');
      assert.ok(response.body.tokens.accessToken);
    });

    it('rejects a duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'Password123' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'Password123' });

      assert.equal(response.status, 409);
    });

    it('rejects invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'short' });

      assert.equal(response.status, 400);
    });

    it('normalizes mixed-case/whitespace email so it collides with a lowercase account (#806)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: '  Test@Example.com ', password: 'Password123' });

      const second = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com ', password: 'Password123' });

      assert.equal(second.status, 409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@example.com', password: 'Password123' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'Password123' });

      assert.equal(response.status, 200);
      assert.ok(response.body.tokens.accessToken);
    });

    it('rejects an invalid password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login2@example.com', password: 'Password123' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login2@example.com', password: 'incorrect-pass' });

      assert.equal(response.status, 401);
    });

    it('rejects a non-existent account', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@example.com', password: 'Password123' });

      assert.equal(response.status, 401);
    });
  });

  describe('POST /api/auth/refresh (#1263)', () => {
    const email = 'refresh@example.com';
    const password = 'Password123';

    async function loginWithRefresh(): Promise<string> {
      await request(app).post('/api/auth/register').send({ email, password });
      const response = await request(app).post('/api/auth/login').send({ email, password });
      assert.equal(response.status, 200);
      const refreshToken = response.body.tokens.refreshToken as string;
      assert.ok(refreshToken, 'login should return a refresh token');
      return refreshToken;
    }

    it('issues a rotated token pair for a valid refresh token', async () => {
      const refreshToken = await loginWithRefresh();
      const response = await request(app).post('/api/auth/refresh').send({ refreshToken });

      assert.equal(response.status, 200);
      assert.ok(response.body.tokens.accessToken);
      assert.ok(response.body.tokens.refreshToken);
      assert.notEqual(response.body.tokens.refreshToken, refreshToken);

      const second = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: response.body.tokens.refreshToken });
      assert.equal(second.status, 200);
    });

    it('is mounted on the /api/v1/auth alias', async () => {
      const refreshToken = await loginWithRefresh();
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      assert.equal(response.status, 200);
      assert.ok(response.body.tokens.accessToken);
    });

    it('rejects reuse of a rotated refresh token', async () => {
      const refreshToken = await loginWithRefresh();
      await request(app).post('/api/auth/refresh').send({ refreshToken }).expect(200);

      const reused = await request(app).post('/api/auth/refresh').send({ refreshToken });
      assert.equal(reused.status, 401);
      assert.match(reused.body.error.message, /already been used/);
    });

    it('rejects an expired refresh token', async () => {
      const expired = jwt.sign(
        { sub: 'refresh-user', jti: 'expired-token', type: 'refresh' },
        env.JWT_SECRET,
        { expiresIn: -1 },
      );
      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: expired });

      assert.equal(response.status, 401);
      assert.match(response.body.error.message, /expired/);
    });

    it('rejects a stored refresh token whose expiry has passed', async () => {
      const refreshToken = await loginWithRefresh();
      const payload = jwt.decode(refreshToken) as jwt.JwtPayload;
      const staleToken = jwt.sign(
        { sub: payload.sub, jti: 'stale-token', type: 'refresh' },
        env.JWT_SECRET,
        { expiresIn: '1h' },
      );
      await authRepository.createRefreshToken({
        tokenHash: createHash('sha256').update(staleToken).digest('hex'),
        userId: payload.sub as string,
        expiresAt: new Date(Date.now() - 1000),
        userAgent: null,
        ip: null,
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: staleToken });
      assert.equal(response.status, 401);
    });

    it('rejects malformed refresh requests', async () => {
      const missing = await request(app).post('/api/auth/refresh').send({});
      assert.equal(missing.status, 400);
      assert.equal(missing.body.error.code, 'VALIDATION_ERROR');

      const wrongType = await request(app).post('/api/auth/refresh').send({ refreshToken: 42 });
      assert.equal(wrongType.status, 400);

      const bogus = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not-a-jwt' });
      assert.equal(bogus.status, 401);
    });

    it('does not accept an access token as a refresh token', async () => {
      await request(app).post('/api/auth/register').send({ email, password });
      const login = await request(app).post('/api/auth/login').send({ email, password });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: login.body.tokens.accessToken });
      assert.equal(response.status, 401);
    });
  });

  describe('security headers (#801)', () => {
    it('sends standard Helmet headers', async () => {
      const response = await request(app).get('/health');

      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.ok(response.headers['x-dns-prefetch-control']);
      assert.ok(response.headers['x-frame-options']);
    });
  });

  describe('CORS allow-list (#800)', () => {
    it('allows an origin from the configured allow-list', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      assert.ok(response.headers['access-control-allow-origin']);
    });
  });

  describe('DELETE /api/auth/account (#1296)', () => {
    it('deletes account when re-auth credentials are valid', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'delete-me@example.com', password: 'Password123' });

      const response = await request(app)
        .delete('/api/auth/account')
        .send({ email: 'delete-me@example.com', password: 'Password123' });

      assert.equal(response.status, 200);

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'delete-me@example.com', password: 'Password123' });
      assert.equal(login.status, 401);
    });

    it('rejects deletion with invalid password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'delete-fail@example.com', password: 'Password123' });

      const response = await request(app)
        .delete('/api/auth/account')
        .send({ email: 'delete-fail@example.com', password: 'wrong-pass' });

      assert.equal(response.status, 401);
    });
  });
});
