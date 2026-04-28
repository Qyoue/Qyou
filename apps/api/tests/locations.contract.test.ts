import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { locationsRouter } from '../routes/locations';
import { errorHandler } from '../middleware/errorHandler';
import { Location } from '../models/Location';

type LocationRecord = {
  _id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  location: { type: 'Point'; coordinates: [number, number] };
};

const originalMethods = {
  aggregate: Location.aggregate,
  findById: Location.findById,
};

let locations: LocationRecord[] = [];

beforeEach(() => {
  locations = [
    {
      _id: '507f191e810c19729de860ea',
      name: 'City Hospital',
      type: 'hospital',
      status: 'active',
      address: '5 Health Ave',
      location: { type: 'Point', coordinates: [3.38, 6.44] },
    },
  ];

  (Location.aggregate as unknown) = (async () =>
    locations.map((loc) => ({ ...loc, distanceFromUser: 250 }))) as typeof Location.aggregate;

  (Location.findById as unknown) = ((id: string) => ({
    lean: async () => locations.find((loc) => loc._id === id) || null,
  })) as typeof Location.findById;
});

afterEach(() => {
  Location.aggregate = originalMethods.aggregate;
  Location.findById = originalMethods.findById;
});

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/locations', locationsRouter);
  app.use(errorHandler);
  return app;
};

test('GET /locations/nearby returns locations within radius', async () => {
  const app = createTestApp();
  const res = await request(app)
    .get('/locations/nearby')
    .query({ lat: 6.44, lng: 3.38, radiusInMeters: 500 });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.locations));
});

test('GET /locations/nearby returns 400 when lat/lng are missing', async () => {
  const app = createTestApp();
  const res = await request(app).get('/locations/nearby');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('GET /locations/:id returns location detail', async () => {
  const app = createTestApp();
  const res = await request(app).get('/locations/507f191e810c19729de860ea');

  assert.equal(res.status, 200);
  assert.equal(res.body.data.location.name, 'City Hospital');
});

test('GET /locations/:id returns 404 for unknown id', async () => {
  const app = createTestApp();
  const res = await request(app).get('/locations/000000000000000000000000');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});
