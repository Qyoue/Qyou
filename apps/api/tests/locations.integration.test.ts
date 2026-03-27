import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { adminLocationSeedRouter } from '../routes/adminLocationSeed';
import { locationsRouter } from '../routes/locations';
import { errorHandler } from '../middleware/errorHandler';
import { Location } from '../models/Location';

type LocationRecord = {
  _id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt?: Date;
  updatedAt?: Date;
};

const originalMethods = {
  countDocuments: Location.countDocuments,
  find: Location.find,
  findById: Location.findById,
  findByIdAndUpdate: Location.findByIdAndUpdate,
  aggregate: Location.aggregate,
  create: Location.create,
};

let locations: LocationRecord[] = [];

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_with_32_chars!';
  locations = [
    {
      _id: '507f191e810c19729de860aa',
      name: 'Main Branch',
      type: 'bank',
      status: 'active',
      address: '1 Marina',
      location: { type: 'Point', coordinates: [3.39, 6.45] },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  (Location.countDocuments as unknown) = (async () => locations.length) as typeof Location.countDocuments;
  (Location.find as unknown) = ((filter?: Record<string, unknown>) => {
    const rows = locations.filter((location) => {
      if (!filter?.status) return true;
      return location.status === filter.status;
    });
    return {
      sort: () => ({
        skip: () => ({
          limit: async () => rows,
        }),
      }),
      lean: async () => rows,
    };
  }) as typeof Location.find;
  (Location.findById as unknown) = (async (id: string) =>
    locations.find((location) => location._id === id) || null) as typeof Location.findById;
  (Location.aggregate as unknown) = (async () =>
    locations.map((location) => ({
      ...location,
      distanceFromUser: 120,
    }))) as typeof Location.aggregate;
  (Location.create as unknown) = (async (payload: Omit<LocationRecord, '_id'>) => {
    const next = {
      _id: '507f191e810c19729de860ab',
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    locations.push(next);
    return next;
  }) as typeof Location.create;
  (Location.findByIdAndUpdate as unknown) = (async (id: string, update: { $set: Partial<LocationRecord> }) => {
    const index = locations.findIndex((location) => location._id === id);
    if (index === -1) return null;
    locations[index] = {
      ...locations[index],
      ...update.$set,
      updatedAt: new Date(),
    };
    return locations[index];
  }) as typeof Location.findByIdAndUpdate;
});

afterEach(() => {
  Location.countDocuments = originalMethods.countDocuments;
  Location.find = originalMethods.find;
  Location.findById = originalMethods.findById;
  Location.findByIdAndUpdate = originalMethods.findByIdAndUpdate;
  Location.aggregate = originalMethods.aggregate;
  Location.create = originalMethods.create;
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/locations', locationsRouter);
  app.use('/admin', adminLocationSeedRouter);
  app.use(errorHandler);
  return app;
};

const adminToken = () =>
  jwt.sign({ type: 'access', sub: 'admin_1', role: 'ADMIN' }, process.env.JWT_ACCESS_SECRET as string);

test('public location endpoints return data', async () => {
  const app = createTestApp();

  const nearbyResponse = await request(app)
    .get('/locations/nearby')
    .query({ lat: 6.45, lng: 3.39, radiusInMeters: 1000, limit: 10 });
  assert.equal(nearbyResponse.status, 200);

  const detailResponse = await request(app).get('/locations/507f191e810c19729de860aa');
  assert.equal(detailResponse.status, 200);
});

test('admin can create and deactivate locations', async () => {
  const app = createTestApp();

  const createResponse = await request(app)
    .post('/admin/locations')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({
      name: 'New Location',
      type: 'hospital',
      address: '10 Broad Street',
      latitude: 6.5,
      longitude: 3.4,
    });
  assert.equal(createResponse.status, 201);

  const patchResponse = await request(app)
    .patch('/admin/locations/507f191e810c19729de860ab')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({
      status: 'inactive',
    });
  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body.data.item.status, 'inactive');
});

