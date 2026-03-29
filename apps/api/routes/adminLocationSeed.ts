import { Router } from 'express';
import { ValidationError } from '../errors/AppError';
import { parseEnum, requireString } from '../lib/validation';
import { requireAdmin } from '../middleware/adminAuth';
import { Location } from '../models/Location';
import { recordAuditEvent } from '../services/auditLog';
import { seedLocationsFromProvider } from '../services/placeSeed';

const router = Router();
const SORT_FIELDS = ['name', 'type', 'status', 'address', 'createdAt', 'updatedAt'] as const;

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

const parseSortField = (value: unknown) => {
  const raw = value === undefined ? 'createdAt' : value;
  return parseEnum(raw, 'sort', SORT_FIELDS);
};

const parseSortDirection = (value: unknown) => {
  const raw = value === undefined ? 'desc' : String(value).toLowerCase();
  return parseEnum(raw, 'dir', ['asc', 'desc'] as const);
};

router.get('/locations', requireAdmin, async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 50), 50);
  const sortField = parseSortField(req.query.sort);
  const sortDirection = parseSortDirection(req.query.dir);
  const typeFilter = req.query.type ? requireString(req.query.type, 'type') : '';
  const search = req.query.search ? String(req.query.search).trim() : '';

  const filter: Record<string, unknown> = {};
  if (typeFilter) {
    filter.type = typeFilter;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Location.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = await Location.find(filter)
    .sort({ [sortField]: sortDirection === 'asc' ? 1 : -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  res.json({
    success: true,
    data: {
      rows: rows.map((row) => ({
        id: String(row._id),
        name: row.name,
        type: row.type,
        status: row.status,
        address: row.address,
        coordinates: row.location?.coordinates || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      sort: {
        field: sortField,
        direction: sortDirection,
      },
      filters: {
        type: typeFilter || null,
        search: search || null,
      },
    },
  });
});

router.post('/locations/seed', requireAdmin, async (req, res) => {
  const result = await seedLocationsFromProvider(req.body || {});

  const authorization = req.headers.authorization || '';
  const actorRole = authorization.startsWith('Bearer ') ? 'ADMIN' : undefined;

  await recordAuditEvent({
    action: 'ADMIN_LOCATION_SEED',
    actorRole,
    targetType: 'location-seed-job',
    metadata: {
      provider: result.provider,
      fetched: result.fetched,
      inserted: result.inserted,
      updated: result.updated,
      durationMs: result.durationMs,
    },
    req,
  });

  res.json({
    success: true,
    data: result,
  });
});

router.post('/locations', requireAdmin, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const type = String(req.body?.type || '').trim();
  const address = String(req.body?.address || '').trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (!name || name.length < 2) {
    throw new ValidationError('name must be at least 2 characters');
  }
  if (!['bank', 'hospital', 'atm', 'government', 'fuel_station', 'other'].includes(type)) {
    throw new ValidationError('type must be one of: bank, hospital, atm, government, fuel_station, other');
  }
  if (!address || address.length < 5) {
    throw new ValidationError('address must be at least 5 characters');
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ValidationError('latitude must be between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ValidationError('longitude must be between -180 and 180');
  }

  const location = await Location.create({
    name,
    type,
    address,
    status: 'active',
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  });

  res.status(201).json({
    success: true,
    data: {
      item: {
        id: String(location._id),
      },
    },
  });
});

router.patch('/locations/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new ValidationError('id must be a valid location identifier');
  }

  const updates: Record<string, unknown> = {};
  if (req.body?.status !== undefined) {
    const status = String(req.body.status).trim();
    if (!['active', 'inactive'].includes(status)) {
      throw new ValidationError('status must be either active or inactive');
    }
    updates.status = status;
  }
  if (req.body?.name !== undefined) {
    updates.name = String(req.body.name).trim();
  }

  const location = await Location.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
  if (!location) {
    throw new ValidationError('Location not found');
  }

  res.json({
    success: true,
    data: {
      item: {
        id: String(location._id),
        status: location.status,
        name: location.name,
      },
    },
  });
});

export const adminLocationSeedRouter = router;
