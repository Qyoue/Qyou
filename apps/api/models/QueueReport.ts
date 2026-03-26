import { Model, Schema, Types, model, models } from 'mongoose';

export type QueueReportLevel = 'none' | 'low' | 'medium' | 'high' | 'unknown';

export interface QueueReportDocument {
  locationId: Types.ObjectId;
  userId: Types.ObjectId;
  waitTimeMinutes?: number;
  level: QueueReportLevel;
  notes?: string;
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
  reportedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const queueReportSchema = new Schema<QueueReportDocument>(
  {
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    waitTimeMinutes: {
      type: Number,
      min: 0,
      max: 1440,
    },
    level: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'unknown'],
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 280,
    },
    status: {
      type: String,
      enum: ['accepted', 'rejected'],
      default: 'accepted',
      required: true,
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    reportedAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

queueReportSchema.index({ locationId: 1, reportedAt: -1 }, { name: 'location_reported_at_desc' });
queueReportSchema.index({ userId: 1, reportedAt: -1 }, { name: 'user_reported_at_desc' });

export const QueueReport =
  (models.QueueReport as Model<QueueReportDocument>) ||
  model<QueueReportDocument>('QueueReport', queueReportSchema);

export const ensureQueueReportIndexes = async () => {
  await QueueReport.syncIndexes();
};

