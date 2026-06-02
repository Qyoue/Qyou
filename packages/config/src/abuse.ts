import type { AbuseCheckResult, AbuseContext, RateLimitBucket } from "@qyou/types";

/**
 * AUTH-116 — In-process rate-limit store (dev/test baseline).
 * Replace with Redis or a shared store for production.
 */
const buckets = new Map<string, RateLimitBucket>();

/** Default limits per operation per key (attempts per windowMs). */
const LIMITS: Record<AbuseContext["operation"], { max: number; windowMs: number }> = {
  login: { max: 10, windowMs: 60_000 },
  register: { max: 5, windowMs: 60_000 },
  "password-reset": { max: 3, windowMs: 300_000 },
  "challenge-verify": { max: 10, windowMs: 60_000 },
};

function bucketKey(ctx: AbuseContext): string {
  const dim = ctx.accountId ?? ctx.ip ?? "anon";
  return `${ctx.operation}:${dim}`;
}

/**
 * Check whether an auth operation should be allowed.
 * Increments the counter on every call; callers should only invoke
 * this once per real attempt (not for reads).
 */
export function checkAbuse(ctx: AbuseContext): AbuseCheckResult {
  const { max, windowMs } = LIMITS[ctx.operation];
  const key = bucketKey(ctx);
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { key, count: 0, resetAt: now + windowMs };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > max) {
    return { allowed: false, code: "RATE_LIMITED", retryAfterMs: bucket.resetAt - now };
  }

  return { allowed: true };
}

/** Reset all buckets — useful in tests. */
export function resetAbuseBuckets(): void {
  buckets.clear();
}
