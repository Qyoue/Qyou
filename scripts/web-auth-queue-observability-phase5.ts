export interface QueueMembershipMetric {
  metricName: string;
  metricType: 'counter' | 'histogram' | 'gauge';
  unit: string;
  description: string;
}

export interface WebAuthQueuePhase5Contract {
  authUxBoundary: {
    package: string;
    wiredRoutes: string[];
    e2eScenarios: string[];
  };
  queueCreationObservability: {
    enabled: boolean;
    metrics: QueueMembershipMetric[];
  };
}

export const WEB_AUTH_QUEUE_PHASE5_CONTRACT: WebAuthQueuePhase5Contract = {
  authUxBoundary: {
    package: 'packages/shared',
    wiredRoutes: ['/login', '/session/restore', '/auth/callback'],
    e2eScenarios: ['state persistence across refresh', 'token refresh failure handling'],
  },
  queueCreationObservability: {
    enabled: true,
    metrics: [
      { metricName: 'queue_created_total', metricType: 'counter', unit: 'events', description: 'Total queues created' },
      { metricName: 'queue_membership_active_gauge', metricType: 'gauge', unit: 'users', description: 'Current active queue members' },
    ],
  },
};

export function validateWebAuthQueuePhase5(contract: WebAuthQueuePhase5Contract): string[] {
  const errors: string[] = [];
  if (!contract.queueCreationObservability.enabled) errors.push('Queue creation observability must be enabled');
  if (contract.authUxBoundary.wiredRoutes.length === 0) errors.push('Wired routes required');
  return errors;
}
