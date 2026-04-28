import { Model, Schema, model, models } from 'mongoose';

export interface UserDocument {
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const User =
  (models.User as Model<UserDocument>) || model<UserDocument>('User', userSchema);
