import type { Phase5CompatibilityInput } from '@qyou/shared';

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
