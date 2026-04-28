import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { authRouter } from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';
import { User } from '../models/User';
import { Session } from '../models/Session';

type UserRecord = {
  _id: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
};

type SessionRecord = {
  userId: string;
  deviceId: string;
  familyId: string;
  tokenId: string;
  refreshTokenHash: string;
  parentTokenHash?: string;
  replacedByHash?: string;
  status: 'active' | 'consumed' | 'revoked';
  expiresAt: Date;
  consumedAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  save: () => Promise<void>;
};

const originalUserMethods = {
  findOne: User.findOne,
  create: User.create,
  findById: User.findById,
};

const originalSessionMethods = {
  findOne: Session.findOne,
  create: Session.create,
  updateMany: Session.updateMany,
};

let users: UserRecord[] = [];
let sessions: SessionRecord[] = [];

const createSession = (payload: Omit<SessionRecord, 'save'>) => ({
  ...payload,
  save: async () => undefined,
});

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_with_32_chars!';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_with_32_chars';
  users = [];
  sessions = [];

  (User.findOne as unknown) = (async (filter: { email?: string }) =>
    users.find((user) => user.email === filter.email) || null) as typeof User.findOne;

  (User.create as unknown) = (async (payload: Omit<UserRecord, '_id'>) => {
    const record = {
      _id: `user_${users.length + 1}`,
      ...payload,
    };
    users.push(record);
    return record;
  }) as typeof User.create;

  (User.findById as unknown) = (async (id: string) =>
    users.find((user) => user._id === id) || null) as typeof User.findById;

  (Session.updateMany as unknown) = (async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
    sessions = sessions.map((session) => {
      const matches =
        (!filter.userId || session.userId === String(filter.userId)) &&
        (!filter.deviceId || session.deviceId === String(filter.deviceId)) &&
        (!(filter.status as Record<string, unknown> | undefined)?.$ne ||
          session.status !== (filter.status as { $ne: string }).$ne);

      return matches
        ? {
            ...session,
            ...(update.$set as Partial<SessionRecord>),
          }
        : session;
    });

    return { modifiedCount: sessions.length };
  }) as typeof Session.updateMany;

  (Session.create as unknown) = (async (payload: Omit<SessionRecord, 'save'>) => {
    const record = createSession(payload);
    sessions.push(record);
    return record;
  }) as typeof Session.create;

  (Session.findOne as unknown) = (async (filter: Record<string, unknown>) =>
    sessions.find((session) =>
      Object.entries(filter).every(([key, value]) => String((session as Record<string, unknown>)[key]) === String(value))
    ) || null) as typeof Session.findOne;
});

afterEach(() => {
  User.findOne = originalUserMethods.findOne;
  User.create = originalUserMethods.create;
  User.findById = originalUserMethods.findById;
  Session.findOne = originalSessionMethods.findOne;
  Session.create = originalSessionMethods.create;
  Session.updateMany = originalSessionMethods.updateMany;
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
};

test('register, login, and refresh completes through HTTP routes', async () => {
  const app = createTestApp();

  const registerResponse = await request(app).post('/auth/register').send({
    email: 'user@example.com',
    password: 'password123',
  });
  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.success, true);

  const loginResponse = await request(app).post('/auth/login').send({
    email: 'user@example.com',
    password: 'password123',
    deviceId: 'device_a',
  });
  assert.equal(loginResponse.status, 200);
  assert.ok(loginResponse.body.data.accessToken);
  assert.ok(loginResponse.body.data.refreshToken);

  const refreshResponse = await request(app).post('/auth/refresh').send({
    refreshToken: loginResponse.body.data.refreshToken,
  });
  assert.equal(refreshResponse.status, 200);
  assert.ok(refreshResponse.body.data.accessToken);
  assert.ok(refreshResponse.body.data.refreshToken);
});

test('invalid refresh token returns an auth error response', async () => {
  const app = createTestApp();

  const response = await request(app).post('/auth/refresh').send({
    refreshToken: 'bad-token',
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

