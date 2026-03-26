import { Router } from 'express';
import { ValidationError } from '../errors/AppError';
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
  const sort = String(value || 'createdAt');
  if (!SORT_FIELDS.includes(sort as (typeof SORT_FIELDS)[number])) {
    throw new ValidationError(`sort must be one of: ${SORT_FIELDS.join(', ')}`);
  }
  return sort;
};

const parseSortDirection = (value: unknown) => {
  const dir = String(value || 'desc').toLowerCase();
  if (dir !== 'asc' && dir !== 'desc') {
    throw new ValidationError('dir must be either asc or desc');
  }
  return dir as 'asc' | 'desc';
};

router.get('/locations', requireAdmin, async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 50), 50);
  const sortField = parseSortField(req.query.sort);
  const sortDirection = parseSortDirection(req.query.dir);
  const typeFilter = req.query.type ? String(req.query.type) : '';
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

export const adminLocationSeedRouter = router;
