/**
 * Email Verification & Account Activation (AUTH-021 through AUTH-024).
 *
 * Design (AUTH-021)
 * -----------------
 * - issueVerificationToken(accountId): generates a UUID token, stores it with TTL.
 *   Call this after registration; deliver the token out-of-band (email transport TODO).
 * - verify(token): validates token, flips account status to "active", single-use.
 * - Store is a Map keyed by token — swap for a DB adapter when persistence is needed.
 * - Per-IP rate-limit (5 attempts / 60 s) mirrors other auth guards (AUTH-023).
 * - Token-length guard and concurrent-verify lock prevent replay/race (AUTH-023).
 * - Store capped at STORE_MAX_SIZE to prevent unbounded growth (AUTH-023).
 *
 * Lifecycle events (AUTH-024)
 * ---------------------------
 *   VERIFY_ATTEMPT        → token received
 *   VERIFY_INVALID        → validation failed
 *   VERIFY_RATE_LIMITED   → IP throttled
 *   VERIFY_EXPIRED        → token not found or past TTL
 *   VERIFY_ALREADY_ACTIVE → account already verified
 *   VERIFY_OK             → account activated
 *   VERIFY_ERROR          → unexpected failure
 */

import { randomUUID } from "node:crypto";
import { createStructuredLogger } from "@qyou/config";
import type { VerificationErrorCode, VerificationInput, VerificationResult } from "@qyou/types";
import { accountsByEmail } from "./store.js";

// ---------------------------------------------------------------------------
// Structured logger (AUTH-024)
// ---------------------------------------------------------------------------

const log = createStructuredLogger({ service: "api", component: "auth.verification" });

function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Verification token store (AUTH-022)
// ---------------------------------------------------------------------------

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const STORE_MAX_SIZE = 10_000;

type VerifyEntry = { accountId: string; expiresAt: number };
export const verificationStore = new Map<string, VerifyEntry>();

export function issueVerificationToken(accountId: string): string {
  const token = randomUUID();
  if (verificationStore.size >= STORE_MAX_SIZE) {
    const oldest = verificationStore.keys().next().value;
    if (oldest !== undefined) verificationStore.delete(oldest);
  }
  verificationStore.set(token, { accountId, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

// ---------------------------------------------------------------------------
// Rate-limit (AUTH-023)
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

/** For tests: reset rate-limit state. */
export function clearVerifyRateBuckets(): void {
  rateBuckets.clear();
}

// ---------------------------------------------------------------------------
// AUTH-023: Concurrent-verify lock — prevents double-spend races
// ---------------------------------------------------------------------------

const verifyInFlight = new Set<string>();

// UUID v4 is always 36 characters
const EXPECTED_TOKEN_LENGTH = 36;

// ---------------------------------------------------------------------------
// Verify service (AUTH-022 / AUTH-023 / AUTH-024)
// ---------------------------------------------------------------------------

export function verify(input: VerificationInput, ip: string): VerificationResult {
  const start = Date.now();
  const prefix = input.token ? tokenPrefix(input.token) : "";
  log("info", "VERIFY_ATTEMPT", { ip, tokenPrefix: prefix });

  if (!input.token || input.token.trim().length === 0) {
    log("warn", "VERIFY_INVALID", { ip, reason: "empty", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "token is required.");
  }

  if (input.token.trim().length !== EXPECTED_TOKEN_LENGTH) {
    log("warn", "VERIFY_INVALID", { ip, reason: "bad_length", tokenPrefix: prefix, latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "token format is invalid.");
  }

  if (isRateLimited(ip)) {
    log("warn", "VERIFY_RATE_LIMITED", { ip, latency_ms: Date.now() - start });
    return fail("RATE_LIMITED", "Too many verification attempts. Try again later.");
  }

  if (verifyInFlight.has(input.token)) {
    log("warn", "VERIFY_INVALID", { ip, reason: "in_flight", tokenPrefix: prefix, latency_ms: Date.now() - start });
    return fail("INVALID_VERIFICATION_TOKEN", "Verification token is already being processed.");
  }

  verifyInFlight.add(input.token);
  try {
    const entry = verificationStore.get(input.token);

    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) verificationStore.delete(input.token);
      log("warn", "VERIFY_EXPIRED", { ip, tokenPrefix: prefix, latency_ms: Date.now() - start });
      return fail("INVALID_VERIFICATION_TOKEN", "Verification token is invalid or has expired.");
    }

    const account = [...accountsByEmail.values()].find((a) => a.id === entry.accountId);
    if (!account) {
      verificationStore.delete(input.token);
      log("warn", "VERIFY_EXPIRED", { ip, accountId: entry.accountId, reason: "no_account", latency_ms: Date.now() - start });
      return fail("INVALID_VERIFICATION_TOKEN", "Verification token is invalid or has expired.");
    }

    if (account.status === "active") {
      verificationStore.delete(input.token);
      log("info", "VERIFY_ALREADY_ACTIVE", { ip, accountId: account.id, latency_ms: Date.now() - start });
      return fail("ALREADY_VERIFIED", "Account is already verified.");
    }

    // Activate account — single-use token
    account.status = "active";
    verificationStore.delete(input.token);

    log("info", "VERIFY_OK", { accountId: account.id, email: account.email, latency_ms: Date.now() - start });
    return { ok: true, accountId: account.id, email: account.email };
  } catch (err) {
    log("error", "VERIFY_ERROR", {
      ip,
      tokenPrefix: prefix,
      error: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    });
    return fail("INTERNAL_ERROR", "Verification failed due to an internal error.");
  } finally {
    verifyInFlight.delete(input.token);
  }
}

function fail(code: VerificationErrorCode, message: string): VerificationResult {
  return { ok: false, code, message };
}

/** Exposed for tests */
export { verifyInFlight };
