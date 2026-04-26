import { Request } from 'express';
import { Types } from 'mongoose';
import { AuditAction, AuditLog } from '../models/AuditLog';

type AuditActor = {
  actorId?: string | Types.ObjectId;
  actorEmail?: string;
  actorRole?: 'USER' | 'ADMIN';
};

type AuditEventInput = AuditActor & {
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
};

const resolveIpAddress = (req?: Request) => {
  if (!req) return undefined;
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim();
  }
  return req.ip || undefined;
};

export const recordAuditEvent = async ({
  action,
  actorId,
  actorEmail,
  actorRole,
  targetType,
  targetId,
  metadata,
  req,
}: AuditEventInput) => {
  await AuditLog.create({
    action,
    actorId: actorId ? new Types.ObjectId(String(actorId)) : undefined,
    actorEmail,
    actorRole,
    targetType,
    targetId,
    metadata,
    ipAddress: resolveIpAddress(req),
    userAgent: req?.headers['user-agent'],
  });
};
