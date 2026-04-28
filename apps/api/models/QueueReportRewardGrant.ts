import { Model, Schema, Types, model, models } from 'mongoose';

export interface QueueReportRewardGrantDocument {
  userId: Types.ObjectId;
  reportReference: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'skipped';
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const queueReportRewardGrantSchema = new Schema<QueueReportRewardGrantDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'skipped'],
      default: 'confirmed',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

queueReportRewardGrantSchema.index({ userId: 1, createdAt: -1 });

export const QueueReportRewardGrant =
  (models.QueueReportRewardGrant as Model<QueueReportRewardGrantDocument>) ||
  model<QueueReportRewardGrantDocument>('QueueReportRewardGrant', queueReportRewardGrantSchema);
