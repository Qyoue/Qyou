export interface QueueDataModelSchema {
  queueId: string;
  name: string;
  capacity: number;
  persistenceStore: 'postgres' | 'redis' | 'memory';
  indexingFields: string[];
}

export interface OperatorModerationControl {
  action: 'pause' | 'resume' | 'evict_user' | 'purge_queue';
  authorizedRoles: string[];
  auditMetricName: string;
}

export interface QueueModelsPersistenceContract {
  phase: number;
  dataModel: QueueDataModelSchema;
  moderationControls: OperatorModerationControl[];
  discoveryEdgeCases: {
    emptySearchFallback: string;
    maxResultsLimit: number;
  };
}

export const QUEUE_MODELS_PERSISTENCE_CONTRACT: QueueModelsPersistenceContract = {
  phase: 1,
  dataModel: {
    queueId: 'q_default',
    name: 'Standard Queue Model',
    capacity: 1000,
    persistenceStore: 'postgres',
    indexingFields: ['status', 'created_at', 'category'],
  },
  moderationControls: [
    { action: 'pause', authorizedRoles: ['admin', 'operator'], auditMetricName: 'queue_operator_pause_total' },
    { action: 'resume', authorizedRoles: ['admin', 'operator'], auditMetricName: 'queue_operator_resume_total' },
    { action: 'evict_user', authorizedRoles: ['admin', 'operator'], auditMetricName: 'queue_operator_evict_total' },
  ],
  discoveryEdgeCases: {
    emptySearchFallback: 'return_popular_queues',
    maxResultsLimit: 50,
  },
};

export function validateQueueModelsPersistence(contract: QueueModelsPersistenceContract): string[] {
  const errors: string[] = [];
  if (contract.phase !== 1) errors.push('Contract phase must be 1');
  if (contract.moderationControls.length < 2) errors.push('At least 2 moderation controls required');
  if (contract.discoveryEdgeCases.maxResultsLimit > 100) errors.push('Max results limit must be <= 100');
  return errors;
}
