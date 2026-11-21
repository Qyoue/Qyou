import {
  queueModerationSchema,
  type QueueModerationInput,
  type QueueModerationRecord,
} from '@qyou/shared';

export class QueueModerationService {
  private readonly auditLogs: QueueModerationRecord[] = [];

  public async applyModeration(input: QueueModerationInput): Promise<QueueModerationRecord> {
    const validated = queueModerationSchema.parse(input);
    const record: QueueModerationRecord = {
      ...validated,
      timestamp: new Date().toISOString(),
    };

    this.auditLogs.push(record);
    return record;
  }

  public getLogsForQueue(queueId: string): QueueModerationRecord[] {
    return this.auditLogs.filter((log) => log.queueId === queueId);
  }
}
