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

type QueueReportRecord = {
  _id: string;
  locationId: string;
  userId: string;
  level: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  waitTimeMinutes?: number;
  notes?: string;
  status: 'accepted' | 'rejected';
  reportedAt: Date;
};

const originalQueueMethods = {
  findOne: QueueReport.findOne,
  find: QueueReport.find,
  create: QueueReport.create,
};

const originalLocationFindById = Location.findById;
const originalUserFindById = User.findById;

let reports: QueueReportRecord[] = [];

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
      reports.find((report) => report.locationId === filter.locationId && report.userId === filter.userId) || null,
  })) as typeof QueueReport.findOne;
  (QueueReport.create as unknown) = (async (payload: Omit<QueueReportRecord, '_id'>) => {
    const next = {
      _id: `report_${reports.length + 1}`,
      ...payload,
    };
    reports.push(next);
    return next;
  }) as typeof QueueReport.create;
  (QueueReport.find as unknown) = ((filter: Record<string, unknown>) => {
    const rows = reports.filter((report) => report.locationId === filter.locationId && report.status === 'accepted');
    return {
      sort: () => ({
        limit: () => ({
          lean: async () => rows,
        }),
      }),
    };
  }) as typeof QueueReport.find;
});

afterEach(() => {
  QueueReport.findOne = originalQueueMethods.findOne;
  QueueReport.find = originalQueueMethods.find;
  QueueReport.create = originalQueueMethods.create;
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
  jwt.sign({ type: 'access', sub: '507f191e810c19729de860aa', role: 'USER' }, process.env.JWT_ACCESS_SECRET as string);

test('queue report endpoint creates a report and returns a snapshot', async () => {
  const app = createTestApp();

  const response = await request(app)
    .post('/queues/report')
    .set('Authorization', `Bearer ${userToken()}`)
    .send({
      locationId: '507f191e810c19729de860ab',
      level: 'high',
      waitTimeMinutes: 30,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.snapshot.level, 'high');
  assert.equal(response.body.data.snapshot.reportCount, 1);
});

test('queue report endpoint rejects recent duplicates', async () => {
  const app = createTestApp();
  reports.push({
    _id: 'existing_1',
    locationId: '507f191e810c19729de860ab',
    userId: '507f191e810c19729de860aa',
    level: 'medium',
    waitTimeMinutes: 20,
    status: 'accepted',
    reportedAt: new Date(),
  });

  const response = await request(app)
    .post('/queues/report')
    .set('Authorization', `Bearer ${userToken()}`)
    .send({
      locationId: '507f191e810c19729de860ab',
      level: 'high',
      waitTimeMinutes: 35,
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

