import { Types } from 'mongoose';
import { ValidationError } from '../errors/AppError';
import { Location } from '../models/Location';
import { QueueReport, QueueReportDocument, QueueReportLevel } from '../models/QueueReport';
import { User } from '../models/User';

const DUPLICATE_COOLDOWN_MINUTES = 5;

type CreateQueueReportInput = {
  locationId: string;
  userId: string;
  waitTimeMinutes?: number;
  level: QueueReportLevel;
  notes?: string;
  reportedAt?: Date;
};

type QueueReportValidationResult = {
  locationObjectId: Types.ObjectId;
  userObjectId: Types.ObjectId;
  waitTimeMinutes?: number;
  level: QueueReportLevel;
  notes?: string;
  reportedAt: Date;
};

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

const normalizeOptionalText = (value: unknown) => {
  const next = String(value || '').trim();
  return next || undefined;
};

export const validateQueueReportInput = async (
  input: CreateQueueReportInput,
): Promise<QueueReportValidationResult> => {
  if (!isObjectId(input.locationId)) {
    throw new ValidationError('locationId must be a valid location identifier');
  }

  if (!isObjectId(input.userId)) {
    throw new ValidationError('userId must be a valid user identifier');
  }

  if (!['none', 'low', 'medium', 'high', 'unknown'].includes(input.level)) {
    throw new ValidationError('level must be one of: none, low, medium, high, unknown');
  }

  if (input.waitTimeMinutes !== undefined) {
    if (!Number.isFinite(input.waitTimeMinutes) || input.waitTimeMinutes < 0 || input.waitTimeMinutes > 1440) {
      throw new ValidationError('waitTimeMinutes must be between 0 and 1440');
    }
  }

  const notes = normalizeOptionalText(input.notes);
  if (notes && notes.length > 280) {
    throw new ValidationError('notes must be 280 characters or less');
  }

  const [location, user] = await Promise.all([
    Location.findById(input.locationId, { _id: 1, status: 1 }).lean(),
    User.findById(input.userId, { _id: 1 }).lean(),
  ]);

  if (!location || location.status !== 'active') {
    throw new ValidationError('locationId must reference an active location');
  }

  if (!user) {
    throw new ValidationError('userId must reference an existing user');
  }

  return {
    locationObjectId: new Types.ObjectId(input.locationId),
    userObjectId: new Types.ObjectId(input.userId),
    waitTimeMinutes: input.waitTimeMinutes,
    level: input.level,
    notes,
    reportedAt: input.reportedAt || new Date(),
  };
};

export const findRecentDuplicateQueueReport = async (params: {
  locationId: string;
  userId: string;
  reportedAt?: Date;
}) => {
  const anchorTime = params.reportedAt || new Date();
  const since = new Date(anchorTime.getTime() - DUPLICATE_COOLDOWN_MINUTES * 60 * 1000);

  return QueueReport.findOne({
    locationId: params.locationId,
    userId: params.userId,
    reportedAt: {
      $gte: since,
      $lte: anchorTime,
    },
    status: 'accepted',
  })
    .sort({ reportedAt: -1 })
    .lean();
};

export const createQueueReport = async (
  input: CreateQueueReportInput,
): Promise<QueueReportDocument> => {
  const validated = await validateQueueReportInput(input);
  const existing = await findRecentDuplicateQueueReport({
    locationId: input.locationId,
    userId: input.userId,
    reportedAt: validated.reportedAt,
  });

  if (existing) {
    throw new ValidationError('A recent queue report already exists for this user and location');
  }

  return QueueReport.create({
    locationId: validated.locationObjectId,
    userId: validated.userObjectId,
    waitTimeMinutes: validated.waitTimeMinutes,
    level: validated.level,
    notes: validated.notes,
    status: 'accepted',
    reportedAt: validated.reportedAt,
  });
};

export const QUEUE_REPORT_RULES = {
  duplicateCooldownMinutes: DUPLICATE_COOLDOWN_MINUTES,
  maxWaitTimeMinutes: 1440,
  maxNotesLength: 280,
} as const;

