import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { QueueReportRewardGrant } from '../models/QueueReportRewardGrant';

type AccessPayload = {
  type?: string;
  sub?: string;
  role?: 'USER' | 'ADMIN';
};

type RewardGrantInput = {
  authorizationHeader?: string;
  reportReference: string;
  amount?: number;
  metadata?: Record<string, unknown>;
};

const DEFAULT_REWARD_AMOUNT = Number(process.env.QUEUE_REPORT_REWARD_AMOUNT || 10);

const readAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
};

const getUserIdFromAuthorization = (authorizationHeader?: string) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const secret = readAccessSecret();
  if (!secret) {
    return null;
  }

  try {
    const token = authorizationHeader.replace('Bearer ', '').trim();
    const payload = jwt.verify(token, secret) as AccessPayload;
    if (payload.type !== 'access' || !payload.sub) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
};

export const grantQueueReportReward = async ({
  authorizationHeader,
  reportReference,
  amount = DEFAULT_REWARD_AMOUNT,
  metadata,
}: RewardGrantInput) => {
  const userId = getUserIdFromAuthorization(authorizationHeader);
  if (!userId) {
    return { granted: false, reason: 'UNAUTHENTICATED' as const };
  }

  const existing = await QueueReportRewardGrant.findOne({ reportReference }).lean();
  if (existing) {
    return { granted: false, reason: 'ALREADY_GRANTED' as const };
  }

  await QueueReportRewardGrant.create({
    userId: new Types.ObjectId(userId),
    reportReference,
    amount,
    status: 'confirmed',
    reason: 'Accepted queue report reward',
    metadata,
  });

  return { granted: true as const };
};
