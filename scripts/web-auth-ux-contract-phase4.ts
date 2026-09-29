export interface WebAuthUxPhase4Step {
  name: string;
  scope: string;
  validationRules: string[];
  persistenceStrategy: 'local_storage' | 'session_cookie' | 'memory';
}

export interface WebAuthUxPhase4Contract {
  phase: number;
  steps: WebAuthUxPhase4Step[];
  e2eCoverage: {
    targetScenarios: string[];
    minPassRate: number;
  };
}

export const WEB_AUTH_UX_PHASE4_CONTRACT: WebAuthUxPhase4Contract = {
  phase: 4,
  steps: [
    {
      name: 'State persistence',
      scope: 'apps/web',
      validationRules: ['non-empty token', 'valid session expiration'],
      persistenceStrategy: 'session_cookie',
    },
    {
      name: 'UX state split',
      scope: 'apps/web',
      validationRules: ['isolated auth context', 'route boundary enforcement'],
      persistenceStrategy: 'memory',
    },
  ],
  e2eCoverage: {
    targetScenarios: ['login state restore', 'session expiry redirect', 'role permissions gate'],
    minPassRate: 100,
  },
};

export function validateWebAuthUxPhase4(contract: WebAuthUxPhase4Contract): string[] {
  const errors: string[] = [];
  if (contract.phase !== 4) errors.push('Contract phase must be 4');
  if (contract.steps.length === 0) errors.push('At least one step required');
  if (contract.e2eCoverage.targetScenarios.length === 0) errors.push('E2E scenarios target required');
  return errors;
}
