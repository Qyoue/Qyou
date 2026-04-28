/** Supported resource types that can appear in an audit log entry. */
export type AuditResource =
  | 'location'
  | 'queue'
  | 'user'
  | 'reward'
  | 'buddy-request';

/** Actions that can be recorded against a resource. */
export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject';

/** Severity level of the audit event. */
export type AuditSeverity = 'info' | 'warning' | 'critical';

/** A single audit-log entry shared between admin UI and backend. */
export interface AuditLogEntry {
  id: string;
  /** ISO-8601 timestamp of when the action occurred. */
  timestamp: string;
  actorId: string;
  actorEmail: string;
  resource: AuditResource;
  resourceId: string;
  action: AuditAction;
  severity: AuditSeverity;
  /** Human-readable summary of the change. */
  description: string;
  /** Arbitrary key/value metadata (e.g. diff snapshot). */
  metadata?: Record<string, unknown>;
}

/** Paginated response wrapper used by the admin audit-log API. */
export interface AuditLogPage {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** Query params accepted by GET /admin/audit-logs. */
export interface AuditLogQuery {
  resource?: AuditResource;
  action?: AuditAction;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
