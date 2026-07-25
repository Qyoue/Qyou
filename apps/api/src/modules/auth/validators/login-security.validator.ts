import {
  secureLoginPayloadSchema,
  type LoginSecurityMetrics,
} from '@qyou/shared';

export function evaluateLoginRisk(payload: unknown): LoginSecurityMetrics {
  const parseResult = secureLoginPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      riskScore: 100,
      requireTwoFactor: false,
      blockReason: 'Payload validation failed',
    };
  }

  const isNewDevice = !parseResult.data.device?.isKnownDevice;
  return {
    riskScore: isNewDevice ? 45 : 10,
    requireTwoFactor: isNewDevice,
  };
}
