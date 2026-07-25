export type QueueMemberRole = 'member' | 'vip' | 'queue_buddy' | 'operator';

export interface QueueMembershipRecord {
  queueId: string;
  userId: string;
  positionNumber: number;
  role: QueueMemberRole;
  joinedAt: string;
  estimatedTurnTime?: string;
}

export interface QueueCreationOptions {
  name: string;
  maxCapacity?: number;
  allowQueueBuddies: boolean;
}

export interface EdgeCaseValidationResult {
  isPermitted: boolean;
  duplicateDetected: boolean;
  capacityExceeded: boolean;
  errorMessage?: string;
}
