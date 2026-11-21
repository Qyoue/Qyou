import {
  slidingSessionSchema,
  tokenRevocationSchema,
  type TokenValidationPhase4Report,
  authTokenHeaderSchema,
  type TokenValidationOutcome,
} from '@qyou/shared';

export function evaluateTokenState(expTimestamp: number): TokenValidationPhase4Report {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const timeRemainingSeconds = expTimestamp - nowInSeconds;

  if (timeRemainingSeconds <= 0) {
    return { isTokenActive: false, requiresRefresh: false, timeRemainingSeconds: 0 };
  }

  const RENEW_THRESHOLD_SECONDS = 300;
  return {
    isTokenActive: true,
    requiresRefresh: timeRemainingSeconds < RENEW_THRESHOLD_SECONDS,
    timeRemainingSeconds,
  };
}

export function validateAuthorizationHeader(authHeader: unknown): TokenValidationOutcome {
  const result = authTokenHeaderSchema.safeParse({ authorization: authHeader });
  if (!result.success) {
    return {
      isValid: false,
      failureReason: result.error.errors[0]?.message ?? 'Invalid header',
    };
  }

  return { isValid: true };
}
