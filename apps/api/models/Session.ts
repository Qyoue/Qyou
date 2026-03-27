import { Model, Schema, Types, model, models } from 'mongoose';

type SessionStatus = 'active' | 'consumed' | 'revoked';

export interface SessionDocument {
  userId: Types.ObjectId;
  deviceId: string;
  familyId: string;
  tokenId: string;
  refreshTokenHash: string;
  parentTokenHash?: string;
  replacedByHash?: string;
  status: SessionStatus;
  consumedAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    tokenId: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    parentTokenHash: {
      type: String,
    },
    replacedByHash: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'consumed', 'revoked'],
      default: 'active',
      required: true,
      index: true,
    },
    consumedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    revokedReason: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session =
  (models.Session as Model<SessionDocument>) ||
  model<SessionDocument>('Session', sessionSchema);
