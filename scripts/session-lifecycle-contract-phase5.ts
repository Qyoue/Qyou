export interface TokenHandlingBoundary {
  tokenType: 'access' | 'refresh' | 'id';
  issuer: string;
  maxAgeSeconds: number;
  rotationStrategy: 'sliding' | 'strict_expiry';
  packageBoundary: string;
}

export interface SessionLifecyclePhase5Contract {
  phase: number;
  tokens: TokenHandlingBoundary[];
  responsibilitySplit: {
    sharedPackage: string[];
    apiApp: string[];
    webApp: string[];
  };
}

export const SESSION_LIFECYCLE_PHASE5_CONTRACT: SessionLifecyclePhase5Contract = {
  phase: 5,
  tokens: [
    { tokenType: 'access', issuer: '@qyou/api', maxAgeSeconds: 900, rotationStrategy: 'strict_expiry', packageBoundary: 'packages/shared' },
    { tokenType: 'refresh', issuer: '@qyou/api', maxAgeSeconds: 604800, rotationStrategy: 'sliding', packageBoundary: 'packages/shared' },
  ],
  responsibilitySplit: {
    sharedPackage: ['Zod schema definitions', 'JWT payload type exports', 'Error enum mappings'],
    apiApp: ['Token signing', 'Session store persistence', 'Revocation list lookup'],
    webApp: ['Token storage', 'Automatic refresh interceptor', 'Session expiry UI state'],
  },
};

export function validateSessionLifecyclePhase5(contract: SessionLifecyclePhase5Contract): string[] {
  const errors: string[] = [];
  if (contract.phase !== 5) errors.push('Contract phase must be 5');
  if (contract.tokens.length < 2) errors.push('Must define at least 2 token types');
  if (contract.responsibilitySplit.sharedPackage.length === 0) errors.push('Shared package responsibilities required');
  return errors;
}
