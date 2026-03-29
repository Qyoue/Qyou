import { Router } from 'express';
import { ValidationError } from '../errors/AppError';
import { requireAdmin } from '../middleware/adminAuth';
import { AuditLog } from '../models/AuditLog';

const router = Router();

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

router.get('/audit-logs', requireAdmin, async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(req.query.pageSize, 25), 100);
  const action = req.query.action ? String(req.query.action).trim() : '';
  const targetType = req.query.targetType ? String(req.query.targetType).trim() : '';

  if (pageSize > 100) {
    throw new ValidationError('pageSize must be less than or equal to 100');
  }

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;

  const total = await AuditLog.countDocuments(filter);
  const rows = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  res.json({
    success: true,
    data: {
      rows: rows.map((row) => ({
        id: String(row._id),
        action: row.action,
        actorId: row.actorId ? String(row.actorId) : null,
        actorEmail: row.actorEmail || null,
        actorRole: row.actorRole || null,
        targetType: row.targetType,
        targetId: row.targetId || null,
        metadata: row.metadata || null,
        ipAddress: row.ipAddress || null,
        userAgent: row.userAgent || null,
        createdAt: row.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      filters: {
        action: action || null,
        targetType: targetType || null,
      },
    },
  });
});

export const adminAuditLogsRouter = router;
