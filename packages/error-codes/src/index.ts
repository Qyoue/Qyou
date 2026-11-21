/**
 * Error codes shared by @qyou/api, web and mobile (#1383).
 *
 * The API serialises errors as `{ error: { code, message } }`; clients branch on
 * `code`, never on the message text. Add a code here (with its HTTP status)
 * before using it anywhere.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_DEACTIVATED: 'AUTH_ACCOUNT_DEACTIVATED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_REAUTH_REQUIRED: 'AUTH_REAUTH_REQUIRED',
  QUEUE_NOT_FOUND: 'QUEUE_NOT_FOUND',
  QUEUE_ALREADY_JOINED: 'QUEUE_ALREADY_JOINED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** HTTP status the API returns for each code. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_ACCOUNT_DEACTIVATED: 401,
  AUTH_SESSION_EXPIRED: 401,
  AUTH_REAUTH_REQUIRED: 401,
  QUEUE_NOT_FOUND: 404,
  QUEUE_ALREADY_JOINED: 409,
};

/** Default, user-safe message for each code. */
export const ERROR_MESSAGE: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'The request is invalid.',
  UNAUTHORIZED: 'Authentication is required or the credentials are invalid.',
  FORBIDDEN: 'You are not allowed to do this.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'The request conflicts with the current state.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Internal server error.',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_ACCOUNT_DEACTIVATED: 'This account has been deactivated.',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  AUTH_REAUTH_REQUIRED: 'Please re-authenticate to continue.',
  QUEUE_NOT_FOUND: 'Queue not found.',
  QUEUE_ALREADY_JOINED: 'You have already joined this queue.',
};

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ErrorCode, value);
}

export function statusFor(code: ErrorCode): number {
  return ERROR_STATUS[code];
}

export function toApiErrorBody(code: ErrorCode, message?: string): ApiErrorBody {
  return { error: { code, message: message ?? ERROR_MESSAGE[code] } };
}

/**
 * Reads the error code out of a parsed API response body. Returns `undefined`
 * for anything that is not a recognised `{ error: { code } }` envelope, so
 * clients can fall back to a generic message.
 */
export function parseApiError(body: unknown): { code: ErrorCode; message: string } | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return undefined;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (!isErrorCode(code)) return undefined;
  return { code, message: typeof message === 'string' ? message : ERROR_MESSAGE[code] };
}
