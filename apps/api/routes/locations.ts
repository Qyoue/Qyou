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

const parseLimit = (value: unknown, max = 200): number => {
  if (value === undefined) return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ValidationError(`limit must be an integer between 1 and ${max}`);
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

const parseZoomLevel = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 22) {
    throw new ValidationError('zoomLevel must be an integer between 1 and 22');
  }
  return parsed;
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

router.get('/clusters', async (req, res) => {
  const neLat = parseFiniteNumber(req.query.neLat, 'neLat');
  const neLng = parseFiniteNumber(req.query.neLng, 'neLng');
  const swLat = parseFiniteNumber(req.query.swLat, 'swLat');
  const swLng = parseFiniteNumber(req.query.swLng, 'swLng');
  const zoomLevel = parseZoomLevel(req.query.zoomLevel);
  const typeFilter = parseTypeFilter(req.query.typeFilter);
  const limit = parseLimit(req.query.limit ?? 1500, 3000);

  if (neLat < -90 || neLat > 90 || swLat < -90 || swLat > 90) {
    throw new ValidationError('Latitude values must be between -90 and 90');
  }
  if (neLng < -180 || neLng > 180 || swLng < -180 || swLng > 180) {
    throw new ValidationError('Longitude values must be between -180 and 180');
  }
  if (neLat <= swLat || neLng <= swLng) {
    throw new ValidationError('Bounding box must have neLat > swLat and neLng > swLng');
  }

  const queryFilter: Record<string, unknown> = {
    status: 'active',
    location: {
      $geoWithin: {
        $box: [
          [swLng, swLat],
          [neLng, neLat],
        ],
      },
    },
  };

  if (typeFilter) {
    queryFilter.type = typeFilter;
  }

  const tileLng = 360 / Math.pow(2, zoomLevel);
  const tileLat = 180 / Math.pow(2, zoomLevel);
  const cellLng = Math.max(tileLng / 3, 0.0005);
  const cellLat = Math.max(tileLat / 3, 0.0005);

  const aggregated = await Location.aggregate([
    { $match: queryFilter },
    {
      $addFields: {
        lng: { $arrayElemAt: ['$location.coordinates', 0] },
        lat: { $arrayElemAt: ['$location.coordinates', 1] },
      },
    },
    {
      $addFields: {
        gridX: {
          $floor: {
            $divide: [{ $add: ['$lng', 180] }, cellLng],
          },
        },
        gridY: {
          $floor: {
            $divide: [{ $add: ['$lat', 90] }, cellLat],
          },
        },
      },
    },
    {
      $group: {
        _id: { x: '$gridX', y: '$gridY' },
        count: { $sum: 1 },
        centerLng: { $avg: '$lng' },
        centerLat: { $avg: '$lat' },
        sample: {
          $first: {
            _id: '$_id',
            name: '$name',
            type: '$type',
            address: '$address',
            status: '$status',
            location: '$location',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        isCluster: { $gt: ['$count', 1] },
        count: 1,
        center: ['$centerLng', '$centerLat'],
        sample: 1,
      },
    },
    {
      $sort: {
        isCluster: -1,
        count: -1,
      },
    },
    {
      $limit: limit,
    },
  ]);

  const items = aggregated.map((entry) => {
    if (entry.isCluster) {
      return {
        isCluster: true,
        count: entry.count,
        center: entry.center as [number, number],
      };
    }

    return {
      isCluster: false,
      id: String(entry.sample._id),
      name: entry.sample.name,
      type: entry.sample.type,
      address: entry.sample.address,
      status: entry.sample.status,
      location: entry.sample.location,
      center: entry.center as [number, number],
    };
  });

  res.json({
    success: true,
    data: {
      zoomLevel,
      bbox: {
        neLat,
        neLng,
        swLat,
        swLng,
      },
      count: items.length,
      items,
    },
  });
});

export const locationsRouter = router;
