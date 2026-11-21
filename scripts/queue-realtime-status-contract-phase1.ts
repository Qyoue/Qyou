export interface QueueWaitTimeMetric {
  queueId: string;
  averageWaitSeconds: number;
  quantile90WaitSeconds: number;
  confidenceScore: number;
}

export interface QueueRealtimeStatusContract {
  phase: number;
  observability: {
    metricsEnabled: boolean;
    pollIntervalSeconds: number;
    logLevel: string;
  };
  edgeCaseHandling: {
    zeroMembersStrategy: 'return_default_estimate';
    serverOfflineFallback: 'cached_snapshot';
    staleDataMaxSeconds: number;
  };
  operationalContract: {
    queueCreationDoc: string;
    statusReportingDoc: string;
  };
}

export const QUEUE_REALTIME_STATUS_CONTRACT: QueueRealtimeStatusContract = {
  phase: 1,
  observability: {
    metricsEnabled: true,
    pollIntervalSeconds: 5,
    logLevel: 'info',
  },
  edgeCaseHandling: {
    zeroMembersStrategy: 'return_default_estimate',
    serverOfflineFallback: 'cached_snapshot',
    staleDataMaxSeconds: 30,
  },
  operationalContract: {
    queueCreationDoc: 'docs/queue-creation-membership-operational-contract.md',
    statusReportingDoc: 'docs/queue-realtime-status-and-creation-operational-contract.md',
  },
};

export function validateQueueRealtimeStatus(contract: QueueRealtimeStatusContract): string[] {
  const errors: string[] = [];
  if (contract.phase !== 1) errors.push('Contract phase must be 1');
  if (!contract.observability.metricsEnabled) errors.push('Observability metrics must be enabled');
  if (contract.edgeCaseHandling.staleDataMaxSeconds > 60) errors.push('Stale data max seconds must be <= 60');
  return errors;
}
