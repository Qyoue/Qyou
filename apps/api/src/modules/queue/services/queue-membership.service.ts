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

  public getMembers(queueId: string): QueueMembershipRecord[] {
    return [...(this.memberships.get(queueId) ?? [])];
  }

  public leaveQueue(queueId: string, userId: string): QueueMembershipRecord[] {
    const existing = this.memberships.get(queueId) ?? [];
    const filtered = existing.filter((m) => m.userId !== userId);
    const compacted = this.compactPositions(filtered);
    this.memberships.set(queueId, compacted);
    return compacted;
  }

  public skipQueue(queueId: string, userId: string): QueueMembershipRecord[] {
    const existing = this.memberships.get(queueId) ?? [];
    const idx = existing.findIndex((m) => m.userId === userId);
    if (idx === -1) return this.compactPositions(existing);
    const copy = [...existing];
    const [member] = copy.splice(idx, 1);
    copy.push(member);
    const compacted = this.compactPositions(copy);
    this.memberships.set(queueId, compacted);
    return compacted;
  }

  private compactPositions(members: QueueMembershipRecord[]): QueueMembershipRecord[] {
    return members.map((m, i) => ({ ...m, positionNumber: i + 1 }));
  }
}
