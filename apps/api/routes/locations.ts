import { Router } from 'express';
import { ValidationError } from '../errors/AppError';
import { LocationType, Location } from '../models/Location';

const router = Router();

const VALID_TYPES: LocationType[] = [
  'bank',
  'hospital',
  'atm',
  'government',
  'fuel_station',
  'other',
];

const parseFiniteNumber = (value: unknown, name: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${name} must be a valid number`);
  }
  return parsed;
};

const parseLimit = (value: unknown): number => {
  if (value === undefined) return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    throw new ValidationError('limit must be an integer between 1 and 200');
  }
  return parsed;
};

const parseTypeFilter = (value: unknown): LocationType | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const type = String(value) as LocationType;
  if (!VALID_TYPES.includes(type)) {
    throw new ValidationError(`typeFilter must be one of: ${VALID_TYPES.join(', ')}`);
  }
  return type;
};

router.get('/nearby', async (req, res) => {
  const lng = parseFiniteNumber(req.query.lng, 'lng');
  const lat = parseFiniteNumber(req.query.lat, 'lat');
  const radiusInMeters = parseFiniteNumber(req.query.radiusInMeters ?? 2000, 'radiusInMeters');
  const limit = parseLimit(req.query.limit);
  const typeFilter = parseTypeFilter(req.query.typeFilter);

  if (lng < -180 || lng > 180) {
    throw new ValidationError('lng must be between -180 and 180');
  }
  if (lat < -90 || lat > 90) {
    throw new ValidationError('lat must be between -90 and 90');
  }
  if (radiusInMeters <= 0 || radiusInMeters > 50000) {
    throw new ValidationError('radiusInMeters must be between 1 and 50000');
  }

  const queryFilter: Record<string, unknown> = {
    status: 'active',
  };

  if (typeFilter) {
    queryFilter.type = typeFilter;
  }

  const locations = await Location.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'distanceFromUser',
        maxDistance: radiusInMeters,
        spherical: true,
        query: queryFilter,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        address: 1,
        status: 1,
        location: 1,
        distanceFromUser: { $round: ['$distanceFromUser', 2] },
      },
    },
    {
      $sort: {
        distanceFromUser: 1,
      },
    },
    {
      $limit: limit,
    },
  ]);

  res.json({
    success: true,
    data: {
      count: locations.length,
      items: locations,
    },
  });
});

export const locationsRouter = router;
