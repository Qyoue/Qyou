import { Model, Schema, model, models } from 'mongoose';

export type ReportStatus = 'pending' | 'verified' | 'rejected';

export interface QueueReportDocument {
  locationId: string;
  userId: string;
  waitMinutes: number;
  queueLength: number;
  status: ReportStatus;
  reportedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const queueReportSchema = new Schema<QueueReportDocument>(
  {
    locationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    waitMinutes: { type: Number, required: true, min: 0, max: 600 },
    queueLength: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      required: true,
    },
    reportedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

queueReportSchema.index({ locationId: 1, reportedAt: -1 });
queueReportSchema.index({ userId: 1, status: 1 });

export const QueueReport =
  (models.QueueReport as Model<QueueReportDocument>) ||
  model<QueueReportDocument>('QueueReport', queueReportSchema);

export const ensureQueueReportIndexes = async () => {
  await QueueReport.syncIndexes();
};
