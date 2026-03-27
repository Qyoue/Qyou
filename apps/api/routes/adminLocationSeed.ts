import { Router } from 'express';
import { ValidationError } from '../errors/AppError';
import { parseEnum, requireString } from '../lib/validation';
import { requireAdmin } from '../middleware/adminAuth';
import { Location } from '../models/Location';
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
  res.json({
    success: true,
    data: result,
  });
});

export const adminLocationSeedRouter = router;
