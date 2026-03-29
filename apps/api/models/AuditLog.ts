import { Model, Schema, Types, model, models } from 'mongoose';

export type AuditAction =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN'
  | 'AUTH_REFRESH'
  | 'AUTH_LOGOUT'
  | 'ADMIN_LOCATION_SEED'
  | 'ADMIN_LOCATION_CREATE'
  | 'ADMIN_LOCATION_UPDATE'
  | 'ADMIN_LOCATION_DEACTIVATE'
  | 'QUEUE_REPORT_SUBMIT';

export interface AuditLogDocument {
  action: AuditAction;
  actorId?: Types.ObjectId;
  actorEmail?: string;
  actorRole?: 'USER' | 'ADMIN';
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'AUTH_REGISTER',
        'AUTH_LOGIN',
        'AUTH_REFRESH',
        'AUTH_LOGOUT',
        'ADMIN_LOCATION_SEED',
        'ADMIN_LOCATION_CREATE',
        'ADMIN_LOCATION_UPDATE',
        'ADMIN_LOCATION_DEACTIVATE',
        'QUEUE_REPORT_SUBMIT',
      ],
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['USER', 'ADMIN'],
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({ createdAt: -1, action: 1 });

export const AuditLog =
  (models.AuditLog as Model<AuditLogDocument>) ||
  model<AuditLogDocument>('AuditLog', auditLogSchema);
