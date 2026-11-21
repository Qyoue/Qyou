import type { ContractEvolutionHeaderInput, Phase5CompatibilityInput } from '@qyou/shared';
import { evaluatePhase4TokenState } from './api-client';

export function getContractHeaders(buildNumber = 100): Record<string, string> {
  const headerPayload: ContractEvolutionHeaderInput = {
    contractVersion: 'v1',
    clientBuildNumber: buildNumber,
    strictValidation: true,
  };

  return {
    'x-contract-version': headerPayload.contractVersion,
    'x-client-build': String(headerPayload.clientBuildNumber),
  };
}

export function createPhase5AssertionHeaders(activeVersion = 'v1.5'): Record<string, string> {
  const payload: Phase5CompatibilityInput = {
    minimumSupportedVersion: 'v1.0',
    activeVersion,
    experimentalFeatures: ['token_rotation_v2'],
  };

  return {
    'x-phase5-contract': payload.activeVersion,
    'x-phase5-min-version': payload.minimumSupportedVersion,
  };
}

export function checkWebTokenLifetime(expiresAtTimestamp: number): boolean {
  const result = evaluatePhase4TokenState(expiresAtTimestamp);
  return result.isTokenActive && !result.requiresRefresh;
}

export function isTokenHeaderValid(token: string): boolean {
  const headerValue = `Bearer ${token}`;
  if (!token || token.split('.').length < 2) {
    return false;
  }
  void headerValue;
  return true;
}
