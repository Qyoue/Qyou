export interface QueueServedEvent {
  userId: string;
  queueId: string;
  event: string;
}

export class UnifiedIncentiveService {
  private readonly processedKeys = new Set<string>();

  async handleQueueServed(event: QueueServedEvent): Promise<{ processed: boolean; idempotencyKey: string }> {
    const idempotencyKey = `${event.userId}:${event.queueId}:${event.event}`;
    if (this.processedKeys.has(idempotencyKey)) {
      return { processed: false, idempotencyKey };
    }
    this.processedKeys.add(idempotencyKey);
    // Placeholder for unified incentive dispatch; idempotency enforced.
    return { processed: true, idempotencyKey };
  }
}

export const unifiedIncentiveService = new UnifiedIncentiveService();
