import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { authRouter } from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { AuditLog } from '../models/AuditLog';

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

const originalAuditLogCreate = AuditLog.create;

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

  (User.findOne as unknown) = ((filter: { email?: string }) => {
    const user = users.find((u) => u.email === filter.email) || null;
    // thenable so `await User.findOne(...)` resolves to user
    // also has .lean() so `await User.findOne(...).lean()` resolves to user
    return {
      then: (resolve: (v: typeof user) => void, reject: (e: unknown) => void) =>
        Promise.resolve(user).then(resolve, reject),
      lean: () => Promise.resolve(user),
    };
  }) as typeof User.findOne;

  (User.create as unknown) = (async (payload: Omit<UserRecord, '_id'>) => {
    const record = { _id: `6${String(users.length + 1).padStart(23, '0')}`, ...payload };
    users.push(record);
    return record;
  }) as typeof User.create;

  (User.findById as unknown) = (async (id: string) =>
    users.find((u) => u._id === id) || null) as typeof User.findById;

  (Session.updateMany as unknown) = (async (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) => {
    sessions = sessions.map((s) => {
      const matches =
        (!filter.userId || s.userId === String(filter.userId)) &&
        (!filter.deviceId || s.deviceId === String(filter.deviceId)) &&
        (!(filter.status as Record<string, unknown> | undefined)?.$ne ||
          s.status !== (filter.status as { $ne: string }).$ne);
      return matches ? { ...s, ...(update.$set as Partial<SessionRecord>) } : s;
    });
    return { modifiedCount: sessions.length };
  }) as typeof Session.updateMany;

  (Session.create as unknown) = (async (payload: Omit<SessionRecord, 'save'>) => {
    const record = createSession(payload);
    sessions.push(record);
    return record;
  }) as typeof Session.create;

  (Session.findOne as unknown) = (async (filter: Record<string, unknown>) =>
    sessions.find((s) =>
      Object.entries(filter).every(
        ([k, v]) => String((s as Record<string, unknown>)[k]) === String(v),
      ),
    ) || null) as typeof Session.findOne;

  (AuditLog.create as unknown) = (async () => ({})) as typeof AuditLog.create;
});

afterEach(() => {
  User.findOne = originalUserMethods.findOne;
  User.create = originalUserMethods.create;
  User.findById = originalUserMethods.findById;
  Session.findOne = originalSessionMethods.findOne;
  Session.create = originalSessionMethods.create;
  Session.updateMany = originalSessionMethods.updateMany;
  AuditLog.create = originalAuditLogCreate;
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
};

const registerAndLogin = async (app: ReturnType<typeof createTestApp>) => {
  await request(app).post('/auth/register').send({
    email: 'user@example.com',
    password: 'password123',
  });
  const loginRes = await request(app).post('/auth/login').send({
    email: 'user@example.com',
    password: 'password123',
    deviceId: 'device_a',
  });
  return loginRes.body.data as { accessToken: string; refreshToken: string };
};

test('refresh token rotation issues a new token pair', async () => {
  const app = createTestApp();
  const { refreshToken } = await registerAndLogin(app);

  const refreshRes = await request(app).post('/auth/refresh').send({ refreshToken });

  assert.equal(refreshRes.status, 200);
  assert.ok(refreshRes.body.data.accessToken);
  assert.ok(refreshRes.body.data.refreshToken);
  assert.notEqual(refreshRes.body.data.refreshToken, refreshToken, 'new refresh token must differ');
});

test('used refresh token cannot be reused (rotation invalidates old token)', async () => {
  const app = createTestApp();
  const { refreshToken } = await registerAndLogin(app);

  // First use — should succeed
  const firstRefresh = await request(app).post('/auth/refresh').send({ refreshToken });
  assert.equal(firstRefresh.status, 200);

  // Second use of the same token — should fail (token is consumed)
  const secondRefresh = await request(app).post('/auth/refresh').send({ refreshToken });
  assert.equal(secondRefresh.status, 401);
  assert.equal(secondRefresh.body.success, false);
});

test('refresh with invalid token returns 401', async () => {
  const app = createTestApp();

  const res = await request(app).post('/auth/refresh').send({ refreshToken: 'not-a-valid-token' });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('refresh without body returns 4xx error', async () => {
  const app = createTestApp();

  const res = await request(app).post('/auth/refresh').send({});

  assert.ok(res.status >= 400 && res.status < 500);
  assert.equal(res.body.success, false);
});

test('new access token from rotation is valid', async () => {
  const app = createTestApp();
  const { refreshToken } = await registerAndLogin(app);

  const refreshRes = await request(app).post('/auth/refresh').send({ refreshToken });
  assert.equal(refreshRes.status, 200);

  const newRefreshToken = refreshRes.body.data.refreshToken;

  // The new refresh token should also be usable
  const secondRefresh = await request(app).post('/auth/refresh').send({ refreshToken: newRefreshToken });
  assert.equal(secondRefresh.status, 200);
  assert.ok(secondRefresh.body.data.accessToken);
});
