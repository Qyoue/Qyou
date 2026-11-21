export interface AccountSafetyRule {
  flow: 'password_reset' | 'email_change' | '2fa_enforcement';
  minEntropy: number;
  rateLimitPerMinute: number;
  packageBoundary: string;
}

export interface SharedAuthContractEvolution {
  version: string;
  schemaEvolutionPolicy: string;
  breakingChangeWarningDays: number;
}

export interface AccountSafetyPhase5Contract {
  phase: number;
  safetyRules: AccountSafetyRule[];
  evolution: SharedAuthContractEvolution;
}

export const ACCOUNT_SAFETY_PHASE5_CONTRACT: AccountSafetyPhase5Contract = {
  phase: 5,
  safetyRules: [
    { flow: 'password_reset', minEntropy: 64, rateLimitPerMinute: 3, packageBoundary: 'packages/shared' },
    { flow: 'email_change', minEntropy: 32, rateLimitPerMinute: 2, packageBoundary: 'packages/shared' },
    { flow: '2fa_enforcement', minEntropy: 128, rateLimitPerMinute: 5, packageBoundary: 'packages/shared' },
  ],
  evolution: {
    version: '2.5.0',
    schemaEvolutionPolicy: 'backward_compatible_extensible',
    breakingChangeWarningDays: 30,
  },
};

export function validateAccountSafetyPhase5(contract: AccountSafetyPhase5Contract): string[] {
  const errors: string[] = [];
  if (contract.phase !== 5) errors.push('Contract phase must be 5');
  if (contract.safetyRules.length < 3) errors.push('At least 3 safety rules required');
  if (contract.evolution.breakingChangeWarningDays < 14) errors.push('Warning days must be >= 14');
  return errors;
}
