import {
  joinQueueSchema,
  type EdgeCaseValidationResult,
  type JoinQueueInput,
  type QueueMembershipRecord,
} from '@qyou/shared';

export class QueueMembershipService {
  private readonly memberships: Map<string, QueueMembershipRecord[]> = new Map();

  public async joinQueue(input: JoinQueueInput): Promise<QueueMembershipRecord> {
    const validated = joinQueueSchema.parse(input);
    const existing = this.memberships.get(validated.queueId) ?? [];

    const isDuplicate = existing.some((m) => m.userId === validated.userId);
    if (isDuplicate) {
      throw new Error('User is already a member of this queue.');
    }

    const newRecord: QueueMembershipRecord = {
      queueId: validated.queueId,
      userId: validated.userId,
      positionNumber: existing.length + 1,
      role: validated.role,
      joinedAt: new Date().toISOString(),
    };

    existing.push(newRecord);
    this.memberships.set(validated.queueId, existing);
    return newRecord;
  }

  public validateJoinEdgeCases(queueId: string, userId: string, maxCapacity = 100): EdgeCaseValidationResult {
    const existing = this.memberships.get(queueId) ?? [];
    const duplicateDetected = existing.some((m) => m.userId === userId);
    const capacityExceeded = existing.length >= maxCapacity;

    return {
      isPermitted: !duplicateDetected && !capacityExceeded,
      duplicateDetected,
      capacityExceeded,
      errorMessage: duplicateDetected
        ? 'Duplicate join attempt'
        : capacityExceeded
        ? 'Queue at maximum capacity'
        : undefined,
    };
  }
}
