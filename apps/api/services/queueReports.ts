import { Types } from 'mongoose';
import { ValidationError } from '../errors/AppError';
import { Location } from '../models/Location';
import { QueueReport, QueueReportDocument, QueueReportLevel } from '../models/QueueReport';
import { User } from '../models/User';

const DUPLICATE_COOLDOWN_MINUTES = 5;
const MAX_WAIT_MINUTES = 1440;
const MAX_NOTES_LENGTH = 280;

type CreateQueueReportInput = {
  locationId: string;
  userId: string;
  waitTimeMinutes?: number;
  level: QueueReportLevel;
  notes?: string;
  reportedAt?: Date;
};

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

const normalizeNotes = (value: unknown) => {
  const next = String(value || '').trim();
  return next || undefined;
};

const validateQueueReportPayload = async (input: CreateQueueReportInput) => {
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
    if (!Number.isFinite(input.waitTimeMinutes) || input.waitTimeMinutes < 0 || input.waitTimeMinutes > MAX_WAIT_MINUTES) {
      throw new ValidationError(`waitTimeMinutes must be between 0 and ${MAX_WAIT_MINUTES}`);
    }
  }

  const notes = normalizeNotes(input.notes);
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    throw new ValidationError(`notes must be ${MAX_NOTES_LENGTH} characters or less`);
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
    locationId: new Types.ObjectId(input.locationId),
    userId: new Types.ObjectId(input.userId),
    waitTimeMinutes: input.waitTimeMinutes,
    level: input.level,
    notes,
    reportedAt: input.reportedAt || new Date(),
  };
};

const findRecentDuplicate = async (params: {
  locationId: string;
  userId: string;
  reportedAt: Date;
}) => {
  const since = new Date(params.reportedAt.getTime() - DUPLICATE_COOLDOWN_MINUTES * 60 * 1000);

  return QueueReport.findOne({
    locationId: params.locationId,
    userId: params.userId,
    status: 'accepted',
    reportedAt: {
      $gte: since,
      $lte: params.reportedAt,
    },
  })
    .sort({ reportedAt: -1 })
    .lean();
};

export const createQueueReport = async (
  input: CreateQueueReportInput,
): Promise<QueueReportDocument> => {
  const validated = await validateQueueReportPayload(input);
  const duplicate = await findRecentDuplicate({
    locationId: input.locationId,
    userId: input.userId,
    reportedAt: validated.reportedAt,
  });

  if (duplicate) {
    throw new ValidationError('A recent queue report already exists for this user and location');
  }

  return QueueReport.create({
    locationId: validated.locationId,
    userId: validated.userId,
    waitTimeMinutes: validated.waitTimeMinutes,
    level: validated.level,
    notes: validated.notes,
    status: 'accepted',
    reportedAt: validated.reportedAt,
  });
};

export const QUEUE_REPORT_RULES = {
  duplicateCooldownMinutes: DUPLICATE_COOLDOWN_MINUTES,
  maxWaitMinutes: MAX_WAIT_MINUTES,
  maxNotesLength: MAX_NOTES_LENGTH,
} as const;

