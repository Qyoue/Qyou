import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { recordAuditEvent } from '../services/auditLog';

type AuditLogRecord = {
  _id: string;
  action: string;
  actorId?: Types.ObjectId;
  actorEmail?: string;
  actorRole?: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

let auditLogs: AuditLogRecord[] = [];

const originalCreate = AuditLog.create;

beforeEach(() => {
  auditLogs = [];
  (AuditLog.create as unknown) = (async (payload: Omit<AuditLogRecord, '_id'>) => {
    const record: AuditLogRecord = {
      _id: `audit_${auditLogs.length + 1}`,
      ...payload,
    };
    auditLogs.push(record);
    return record;
  }) as typeof AuditLog.create;
});

afterEach(() => {
  AuditLog.create = originalCreate;
});

test('recordAuditEvent persists a basic event', async () => {
  await recordAuditEvent({
    action: 'AUTH_LOGIN',
    targetType: 'User',
    targetId: 'user_1',
  });

  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'AUTH_LOGIN');
  assert.equal(auditLogs[0].targetType, 'User');
  assert.equal(auditLogs[0].targetId, 'user_1');
});

test('recordAuditEvent persists actor fields', async () => {
  const actorId = new Types.ObjectId();
  await recordAuditEvent({
    action: 'ADMIN_LOCATION_CREATE',
    actorId,
    actorEmail: 'admin@qyou.local',
    actorRole: 'ADMIN',
    targetType: 'Location',
    targetId: 'loc_1',
  });

  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].actorEmail, 'admin@qyou.local');
  assert.equal(auditLogs[0].actorRole, 'ADMIN');
  assert.ok(auditLogs[0].actorId instanceof Types.ObjectId);
});

test('recordAuditEvent persists metadata', async () => {
  await recordAuditEvent({
    action: 'QUEUE_REPORT_SUBMIT',
    targetType: 'QueueReport',
    metadata: { locationId: 'loc_1', level: 'high' },
  });

  assert.equal(auditLogs.length, 1);
  assert.deepEqual(auditLogs[0].metadata, { locationId: 'loc_1', level: 'high' });
});

test('recordAuditEvent extracts IP from x-forwarded-for header', async () => {
  const mockReq = {
    headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
    ip: '127.0.0.1',
  } as unknown as import('express').Request;

  await recordAuditEvent({
    action: 'AUTH_REGISTER',
    targetType: 'User',
    req: mockReq,
  });

  assert.equal(auditLogs[0].ipAddress, '10.0.0.1');
});

test('recordAuditEvent falls back to req.ip when no x-forwarded-for', async () => {
  const mockReq = {
    headers: {},
    ip: '192.168.1.5',
  } as unknown as import('express').Request;

  await recordAuditEvent({
    action: 'AUTH_LOGIN',
    targetType: 'User',
    req: mockReq,
  });

  assert.equal(auditLogs[0].ipAddress, '192.168.1.5');
});

test('recordAuditEvent works without optional fields', async () => {
  await recordAuditEvent({
    action: 'AUTH_LOGOUT',
    targetType: 'Session',
  });

  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'AUTH_LOGOUT');
  assert.equal(auditLogs[0].actorId, undefined);
  assert.equal(auditLogs[0].ipAddress, undefined);
});
