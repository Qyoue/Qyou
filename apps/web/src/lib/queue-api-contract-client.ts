import type { QueueApiEnvelope, QueueErrorPayload } from '@qyou/shared';

export function unwrapQueueApiResponse<T>(response: QueueApiEnvelope<T>): T {
  if (!response.success || response.error) {
    const errorPayload: QueueErrorPayload = response.error ?? {
      code: 'INVALID_PARAMS',
      message: 'Unknown API error',
    };
    throw new Error(`[${errorPayload.code}] ${errorPayload.message}`);
  }

  if (response.data === undefined) {
    throw new Error('API response contained no payload data');
  }

  return response.data;
}
