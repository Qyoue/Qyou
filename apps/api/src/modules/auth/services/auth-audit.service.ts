import { logger } from '../../../shared/logger/index.js';

export type AuthAuditEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_REFRESH_SUCCESS'
  | 'AUTH_REFRESH_FAILURE'
  | 'AUTH_REGISTER'
  | 'AUTH_LOGOUT'
  | 'AUTH_PASSWORD_RESET_REQUEST'
  | 'AUTH_PASSWORD_RESET_COMPLETE'
  | 'AUTH_EMAIL_VERIFICATION'
  | 'AUTH_SESSION_REVOCATION'
  | 'AUTH_ACCOUNT_DELETION';

export interface AuthAuditEntry {
  id: string;
  type: AuthAuditEventType;
  email?: string;
  userId?: string;
  ip?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_RETENTION_DAYS = 90;

export class AuthAuditService {
  private readonly entries: AuthAuditEntry[] = [];
  readonly retentionDays: number;

  constructor(retentionDays = DEFAULT_RETENTION_DAYS) {
    this.retentionDays = retentionDays;
  }

  record(entry: Omit<AuthAuditEntry, 'id' | 'timestamp'>): AuthAuditEntry {
    const full: AuthAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(full);
    logger.info('[auth-audit]', full.type, { email: full.email, userId: full.userId, ip: full.ip });
    this.prune();
    return full;
  }

  list(filter?: { email?: string; userId?: string; type?: AuthAuditEventType }): AuthAuditEntry[] {
    return this.entries.filter((e) => {
      if (filter?.email && e.email !== filter.email) return false;
      if (filter?.userId && e.userId !== filter.userId) return false;
      if (filter?.type && e.type !== filter.type) return false;
      return true;
    });
  }

  prune(now = Date.now()): number {
    const cutoff = now - this.retentionDays * 24 * 60 * 60 * 1000;
    const before = this.entries.length;
    const kept = this.entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    this.entries.length = 0;
    this.entries.push(...kept);
    return before - this.entries.length;
  }
}
