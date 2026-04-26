/**
 * Canonical error codes used across all route handlers.
 * Keeping them in one place prevents string drift and makes
 * client-side switch statements exhaustive.
 */
export const ErrorCode = {
  // 400
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // 401
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  // 403
  FORBIDDEN: 'FORBIDDEN',
  // 404
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  LOCATION_NOT_FOUND: 'LOCATION_NOT_FOUND',
  // 409
  CONFLICT: 'CONFLICT',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  // 429
  RATE_LIMITED: 'RATE_LIMITED',
  // 500
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Maps an ErrorCode to its canonical HTTP status code. */
export const errorStatusMap: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_INVALID: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  LOCATION_NOT_FOUND: 404,
  CONFLICT: 409,
  EMAIL_TAKEN: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
};

export const statusForCode = (code: ErrorCode): number =>
  errorStatusMap[code] ?? 500;
