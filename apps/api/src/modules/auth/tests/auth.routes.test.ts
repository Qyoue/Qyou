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
});
