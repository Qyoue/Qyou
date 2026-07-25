import {
  slidingSessionSchema,
  tokenRevocationSchema,
  type TokenValidationPhase4Report,
} from '@qyou/shared';

export function evaluatePhase4TokenState(expTimestamp: number): TokenValidationPhase4Report {
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
