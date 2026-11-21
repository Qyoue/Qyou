export interface QueueMembershipPersistence {
  tableName: string;
  partitionKey: string;
  ttlSeconds: number;
}

export interface SharedQueueContractEdgeCase {
  scenario: string;
  resolution: string;
}

export interface QueueMembershipPhase2Contract {
  phase: number;
  persistence: QueueMembershipPersistence;
  observabilityMetrics: string[];
  edgeCases: SharedQueueContractEdgeCase[];
}

export const QUEUE_MEMBERSHIP_PHASE2_CONTRACT: QueueMembershipPhase2Contract = {
  phase: 2,
  persistence: {
    tableName: 'queue_membership',
    partitionKey: 'queue_id',
    ttlSeconds: 86400,
  },
  observabilityMetrics: [
    'queue_member_join_total',
    'queue_member_leave_total',
    'queue_membership_duration_seconds',
  ],
  edgeCases: [
    { scenario: 'duplicate join request', resolution: 'idempotent return existing membership' },
    { scenario: 'invalid queue id', resolution: 'reject with 404 QueueNotFound' },
  ],
};

export function validateQueueMembershipPhase2(contract: QueueMembershipPhase2Contract): string[] {
  const errors: string[] = [];
  if (contract.phase !== 2) errors.push('Contract phase must be 2');
  if (contract.observabilityMetrics.length < 2) errors.push('At least 2 observability metrics required');
  if (contract.edgeCases.length === 0) errors.push('Edge cases must be defined');
  return errors;
}
