import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { queuesRouter } from '../routes/queues';
import { errorHandler } from '../middleware/errorHandler';
import { QueueReport } from '../models/QueueReport';
import { Location } from '../models/Location';
import { User } from '../models/User';

type ReportRecord = {
  _id: string;
  locationId: string;
  userId: string;
  level: string;
  waitTimeMinutes?: number;
  status: 'accepted' | 'rejected';
  reportedAt: Date;
};

const originalMethods = {
  findOne: QueueReport.findOne,
  find: QueueReport.find,
  create: QueueReport.create,
};
const originalLocationFindById = Location.findById;
const originalUserFindById = User.findById;

let reports: ReportRecord[] = [];

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_with_32_chars!';
  reports = [];

  (Location.findById as unknown) = ((id: string) => ({
    lean: async () => ({ _id: id, status: 'active' }),
  })) as typeof Location.findById;

  (User.findById as unknown) = ((id: string) => ({
    lean: async () => ({ _id: id }),
  })) as typeof User.findById;

  (QueueReport.findOne as unknown) = ((filter: Record<string, unknown>) => ({
    lean: async () =>
      reports.find((r) => r.locationId === filter.locationId && r.userId === filter.userId) || null,
  })) as typeof QueueReport.findOne;

  (QueueReport.create as unknown) = (async (payload: Omit<ReportRecord, '_id'>) => {
    const next = { _id: `report_${reports.length + 1}`, ...payload };
    reports.push(next);
    return next;
  }) as typeof QueueReport.create;

  (QueueReport.find as unknown) = ((filter: Record<string, unknown>) => ({
    sort: () => ({
      limit: () => ({
        lean: async () =>
          reports.filter((r) => r.locationId === filter.locationId && r.status === 'accepted'),
      }),
    }),
  })) as typeof QueueReport.find;
});

afterEach(() => {
  QueueReport.findOne = originalMethods.findOne;
  QueueReport.find = originalMethods.find;
  QueueReport.create = originalMethods.create;
  Location.findById = originalLocationFindById;
  User.findById = originalUserFindById;
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/queues', queuesRouter);
  app.use(errorHandler);
  return app;
};

const userToken = () =>
  jwt.sign({ type: 'access', sub: 'user_1', role: 'USER' }, process.env.JWT_ACCESS_SECRET as string);

test('POST /queues/report creates a report and returns a snapshot', async () => {
  const app = createTestApp();
  const res = await request(app)
    .post('/queues/report')
    .set('Authorization', `Bearer ${userToken()}`)
    .send({ locationId: 'loc_1', level: 'medium', waitTimeMinutes: 15 });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.snapshot.level, 'medium');
});

test('POST /queues/report rejects a duplicate submission within the cooldown window', async () => {
  reports.push({
    _id: 'r1',
    locationId: 'loc_1',
    userId: 'user_1',
    level: 'low',
    status: 'accepted',
    reportedAt: new Date(),
  });

  const app = createTestApp();
  const res = await request(app)
    .post('/queues/report')
    .set('Authorization', `Bearer ${userToken()}`)
    .send({ locationId: 'loc_1', level: 'high', waitTimeMinutes: 40 });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('POST /queues/report returns 401 without a token', async () => {
  const app = createTestApp();
  const res = await request(app)
    .post('/queues/report')
    .send({ locationId: 'loc_1', level: 'low' });

  assert.equal(res.status, 401);
});
