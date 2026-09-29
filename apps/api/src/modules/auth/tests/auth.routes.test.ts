import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';
import type { Express } from 'express';

describe('Auth routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp({ authRepository: new InMemoryAuthRepository() });
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'register@example.com', password: 'password123' });

      assert.equal(response.status, 201);
      assert.equal(response.body.user.email, 'register@example.com');
      assert.ok(response.body.tokens.accessToken);
    });

    it('rejects a duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'password123' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'password123' });

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
        .send({ email: '  Test@Example.com ', password: 'password123' });

      const second = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com ', password: 'password123' });

      assert.equal(second.status, 409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@example.com', password: 'password123' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      assert.equal(response.status, 200);
      assert.ok(response.body.tokens.accessToken);
    });

    it('rejects an invalid password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login2@example.com', password: 'password123' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login2@example.com', password: 'incorrect-pass' });

      assert.equal(response.status, 401);
    });

    it('rejects a non-existent account', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@example.com', password: 'password123' });

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
});
