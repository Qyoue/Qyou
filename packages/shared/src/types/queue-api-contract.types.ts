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
