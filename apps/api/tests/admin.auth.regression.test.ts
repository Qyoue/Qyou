import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { adminLocationSeedRouter } from '../routes/adminLocationSeed';
import { adminAuditLogsRouter } from '../routes/adminAuditLogs';
import { errorHandler } from '../middleware/errorHandler';
import { Location } from '../models/Location';
import { AuditLog } from '../models/AuditLog';

const originalLocationMethods = {
  countDocuments: Location.countDocuments,
  find: Location.find,
};
const originalAuditCount = AuditLog.countDocuments;
const originalAuditFind = AuditLog.find;

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_with_32_chars!';

  (Location.countDocuments as unknown) = (async () => 0) as typeof Location.countDocuments;
  (Location.find as unknown) = (() => ({
    sort: () => ({ skip: () => ({ limit: async () => [] }) }),
  })) as typeof Location.find;

  (AuditLog.countDocuments as unknown) = (async () => 0) as typeof AuditLog.countDocuments;
  (AuditLog.find as unknown) = (() => ({
    sort: () => ({ skip: () => ({ limit: async () => [] }) }),
  })) as typeof AuditLog.find;
});

afterEach(() => {
  Location.countDocuments = originalLocationMethods.countDocuments;
  Location.find = originalLocationMethods.find;
  AuditLog.countDocuments = originalAuditCount;
  AuditLog.find = originalAuditFind;
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminLocationSeedRouter);
  app.use('/admin', adminAuditLogsRouter);
  app.use(errorHandler);
  return app;
};

const adminToken = () =>
  jwt.sign({ type: 'access', sub: 'admin_1', role: 'ADMIN' }, process.env.JWT_ACCESS_SECRET as string);

const userToken = () =>
  jwt.sign({ type: 'access', sub: 'user_1', role: 'USER' }, process.env.JWT_ACCESS_SECRET as string);

test('admin can access GET /admin/locations', async () => {
  const app = createTestApp();
  const res = await request(app)
    .get('/admin/locations')
    .set('Authorization', `Bearer ${adminToken()}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('non-admin user is rejected from GET /admin/locations', async () => {
  const app = createTestApp();
  const res = await request(app)
    .get('/admin/locations')
    .set('Authorization', `Bearer ${userToken()}`);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('unauthenticated request is rejected from GET /admin/audit-logs', async () => {
  const app = createTestApp();
  const res = await request(app).get('/admin/audit-logs');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('admin can access GET /admin/audit-logs', async () => {
  const app = createTestApp();
  const res = await request(app)
    .get('/admin/audit-logs')
    .set('Authorization', `Bearer ${adminToken()}`);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data.rows));
});
