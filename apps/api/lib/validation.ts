import { ValidationError } from '../errors/AppError';

export const requireString = (value: unknown, field: string) => {
  const next = String(value || '').trim();
  if (!next) {
    throw new ValidationError(`${field} is required`);
  }
  return next;
};

export const requireEmail = (value: unknown, field = 'email') => {
  const email = requireString(value, field).toLowerCase();
  if (!email.includes('@')) {
    throw new ValidationError(`${field} must be a valid email address`);
  }
  return email;
};

export const requireMinLength = (value: string, field: string, minLength: number) => {
  if (value.length < minLength) {
    throw new ValidationError(`${field} must be at least ${minLength} characters`);
  }
  return value;
};

export const parseFiniteNumber = (value: unknown, field: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${field} must be a valid number`);
  }
  return parsed;
};

export const parseIntegerInRange = (value: unknown, field: string, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`${field} must be an integer between ${min} and ${max}`);
  }
  return parsed;
};

export const parseEnum = <T extends string>(value: unknown, field: string, allowed: readonly T[]) => {
  const next = String(value || '') as T;
  if (!allowed.includes(next)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return next;
};

export const optionalEnum = <T extends string>(value: unknown, field: string, allowed: readonly T[]) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return parseEnum(value, field, allowed);
};

