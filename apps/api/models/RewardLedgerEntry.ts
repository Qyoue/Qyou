import { Model, Schema, Types, model, models } from 'mongoose';

export type RewardLedgerEntryType = 'GRANT' | 'DEBIT' | 'CLAIM' | 'ADJUSTMENT';
export type RewardLedgerEntryStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface RewardLedgerEntryDocument {
  userId: Types.ObjectId;
  amount: number;
  type: RewardLedgerEntryType;
  status: RewardLedgerEntryStatus;
  reference: string;
  source: string;
  memo?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const rewardLedgerEntrySchema = new Schema<RewardLedgerEntryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['GRANT', 'DEBIT', 'CLAIM', 'ADJUSTMENT'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'FAILED'],
      default: 'CONFIRMED',
      required: true,
      index: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    memo: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

rewardLedgerEntrySchema.index({ userId: 1, createdAt: -1 });

export const RewardLedgerEntry =
  (models.RewardLedgerEntry as Model<RewardLedgerEntryDocument>) ||
  model<RewardLedgerEntryDocument>('RewardLedgerEntry', rewardLedgerEntrySchema);
