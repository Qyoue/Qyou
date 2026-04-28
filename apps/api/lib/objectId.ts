import { Types } from 'mongoose';
import { ValidationError } from '../errors/AppError';

export const isValidObjectId = (value: unknown): value is string =>
  typeof value === 'string' && Types.ObjectId.isValid(value);

export const parseObjectId = (value: unknown, field = 'id'): Types.ObjectId => {
  if (!isValidObjectId(value)) {
    throw new ValidationError(`${field} must be a valid ObjectId`);
  }
  return new Types.ObjectId(value);
};

export const parseOptionalObjectId = (
  value: unknown,
  field = 'id',
): Types.ObjectId | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return parseObjectId(value, field);
};

export const toObjectIdString = (value: unknown): string => String(value);
