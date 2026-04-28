import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { usersRouter } from '../routes/users';
import { errorHandler } from '../middleware/errorHandler';
import { User } from '../models/User';
import { Session } from '../models/Session';

const originalUserFindById = User.findById;
const originalSessionCount = Session.countDocuments;

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_with_32_chars!';

  (User.findById as unknown) = ((_id: string, _projection?: unknown) => ({
    lean: async () => ({
      _id,
      email: 'user@example.com',
      role: 'USER',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-06-01'),
    }),
  })) as typeof User.findById;

  (Session.countDocuments as unknown) = (async () => 2) as typeof Session.countDocuments;
});

afterEach(() => {
  User.findById = originalUserFindById;
  Session.countDocuments = originalSessionCount;
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/users', usersRouter);
  app.use(errorHandler);
  return app;
};

const userToken = (id = 'user_1') =>
  jwt.sign({ type: 'access', sub: id, role: 'USER' }, process.env.JWT_ACCESS_SECRET as string);

test('GET /users/me/profile returns session-scoped profile for authenticated user', async () => {
  const app = createTestApp();
  const res = await request(app).get('/users/me/profile').set('Authorization', `Bearer ${userToken()}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.email, 'user@example.com');
  assert.equal(res.body.data.user.role, 'USER');
  assert.equal(typeof res.body.data.contributionSummary.activeSessions, 'number');
});

test('GET /users/me/profile returns 401 when no token is provided', async () => {
  const app = createTestApp();
  const res = await request(app).get('/users/me/profile');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('GET /users/me/profile returns 401 for an invalid token', async () => {
  const app = createTestApp();
  const res = await request(app).get('/users/me/profile').set('Authorization', 'Bearer bad.token.here');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});
