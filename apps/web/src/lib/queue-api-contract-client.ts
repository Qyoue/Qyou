import type { QueueApiEnvelope, QueueErrorPayload, QueueItem } from '@qyou/shared';
import { getJson } from './api-client';

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

export async function listQueues(signal?: AbortSignal): Promise<QueueItem[]> {
  const response = await getJson<QueueApiEnvelope<QueueItem[]>>('/api/v1/queues', { signal });
  return unwrapQueueApiResponse(response);
}

export async function getQueue(queueId: string, signal?: AbortSignal): Promise<QueueItem> {
  const response = await getJson<QueueApiEnvelope<QueueItem>>(`/api/v1/queues/${queueId}`, { signal });
  return unwrapQueueApiResponse(response);
}
