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
};

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

export const createQueueReport = async (
  input: CreateQueueReportInput,
): Promise<QueueReportDocument> => {
  if (!isObjectId(input.locationId)) {
    throw new ValidationError('locationId must be a valid location identifier');
  }
  if (!isObjectId(input.userId)) {
    throw new ValidationError('userId must be a valid user identifier');
  }
  if (!['none', 'low', 'medium', 'high', 'unknown'].includes(input.level)) {
    throw new ValidationError('level must be one of: none, low, medium, high, unknown');
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

  const reportedAt = new Date();
  const since = new Date(reportedAt.getTime() - DUPLICATE_COOLDOWN_MINUTES * 60 * 1000);

  const duplicate = await QueueReport.findOne({
    locationId: input.locationId,
    userId: input.userId,
    status: 'accepted',
    reportedAt: { $gte: since, $lte: reportedAt },
  }).lean();

  if (duplicate) {
    throw new ValidationError('A recent queue report already exists for this user and location');
  }

  return QueueReport.create({
    locationId: new Types.ObjectId(input.locationId),
    userId: new Types.ObjectId(input.userId),
    waitTimeMinutes: input.waitTimeMinutes,
    level: input.level,
    notes: input.notes,
    status: 'accepted',
    reportedAt,
  });
};

