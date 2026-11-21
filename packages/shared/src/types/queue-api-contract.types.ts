export type QueueErrorCode =
  | 'QUEUE_NOT_FOUND'
  | 'QUEUE_FULL'
  | 'DUPLICATE_MEMBERSHIP'
  | 'UNAUTHORIZED_OPERATOR'
  | 'INVALID_PARAMS';

export interface QueueErrorPayload {
  code: QueueErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// #825: Pagination contract — all list endpoints MUST return PaginationMeta
// in the `meta` field of QueueApiEnvelope. Use offset-based pagination:
// `?page=1&limit=20` (1-indexed). Page size capped at 100 server-side.
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface QueueApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: QueueErrorPayload;
  meta?: PaginationMeta;
}
