import { Request } from 'express';
import { ValidationError } from '../errors/AppError';

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
};

export type SortParams = {
  field: string;
  order: 1 | -1;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const parsePagination = (
  query: Request['query'],
  defaults: { limit?: number; maxLimit?: number } = {},
): PaginationParams => {
  const defaultLimit = defaults.limit ?? 20;
  const maxLimit = defaults.maxLimit ?? 200;

  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? defaultLimit);

  if (!Number.isInteger(rawPage) || rawPage < 1) {
    throw new ValidationError('page must be a positive integer');
  }
  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    throw new ValidationError('limit must be a positive integer');
  }

  const page = rawPage;
  const limit = clamp(rawLimit, 1, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const parseSort = (
  query: Request['query'],
  allowedFields: readonly string[],
  defaultField = 'createdAt',
): SortParams => {
  const rawField = typeof query.sortBy === 'string' ? query.sortBy : defaultField;
  const rawOrder = typeof query.order === 'string' ? query.order : 'desc';

  if (!allowedFields.includes(rawField)) {
    throw new ValidationError(
      `sortBy must be one of: ${allowedFields.join(', ')}`,
    );
  }

  if (rawOrder !== 'asc' && rawOrder !== 'desc') {
    throw new ValidationError('order must be "asc" or "desc"');
  }

  return { field: rawField, order: rawOrder === 'asc' ? 1 : -1 };
};

export const buildPaginationMeta = (params: PaginationParams, total: number) => ({
  page: params.page,
  limit: params.limit,
  total,
  totalPages: Math.ceil(total / params.limit),
});
