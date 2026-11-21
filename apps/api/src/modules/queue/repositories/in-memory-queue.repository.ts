import type { QueueFilterParams, QueueItem } from '@qyou/shared';

export class InMemoryQueueRepository {
  private readonly queues: Map<string, QueueItem> = new Map();

  public async findMany(filter: QueueFilterParams): Promise<QueueItem[]> {
    const list = Array.from(this.queues.values());
    return list.filter((q) => {
      if (filter.category && q.category !== filter.category) return false;
      if (filter.maxWaitTimeMinutes && q.currentWaitTimeMinutes > filter.maxWaitTimeMinutes) return false;
      if (filter.searchQuery && !q.name.toLowerCase().includes(filter.searchQuery.toLowerCase())) return false;
      return true;
    });
  }

  public async save(queue: QueueItem): Promise<QueueItem> {
    this.queues.set(queue.id, queue);
    return queue;
  }
}
