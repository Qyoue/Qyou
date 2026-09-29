import { evaluatePhase4TokenState } from './api-client';

export function checkWebTokenLifetime(expiresAtTimestamp: number): boolean {
  const result = evaluatePhase4TokenState(expiresAtTimestamp);
  return result.isTokenActive && !result.requiresRefresh;
}
