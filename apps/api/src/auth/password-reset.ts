/**
 * Password Reset — service stub (AUTH-016).
 *
 * Design: docs/auth-password-reset.md
 *
 * Two operations:
 *   requestReset(email)         → always ok:true (no email enumeration)
 *   confirmReset(token, newPw)  → validates token, updates password, revokes sessions
 *
 * Wire the route handlers in index.ts when ready to expose via HTTP.
 * Swap resetStore for a DB adapter when persistence is needed.
 */

import { randomUUID } from "node:crypto";
import { createStructuredLogger } from "@qyou/config";
import type {
  PasswordResetConfirmInput,
  PasswordResetConfirmResult,
  PasswordResetRequestInput,
  PasswordResetRequestResult,
} from "@qyou/types";
import { hashPassword } from "./registration.js";
import { accountsByEmail } from "./store.js";
import { refreshStore } from "./login.js";

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

const log = createStructuredLogger({ service: "api", component: "auth.password_reset" });

// ---------------------------------------------------------------------------
// Reset token store
// ---------------------------------------------------------------------------

const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_STORE_MAX_SIZE = 1_000;

type ResetEntry = { accountId: string; expiresAt: number };
export const resetStore = new Map<string, ResetEntry>();

function storeResetToken(accountId: string): string {
  const token = randomUUID();
  if (resetStore.size >= RESET_STORE_MAX_SIZE) {
    const oldest = resetStore.keys().next().value;
    if (oldest !== undefined) resetStore.delete(oldest);
  }
  resetStore.set(token, { accountId, expiresAt: Date.now() + RESET_TTL_MS });
  return token;
}

// ---------------------------------------------------------------------------
// Rate-limit (per-IP for request, per-token for confirm)
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

/** For tests: reset rate-limit state. */
export function clearResetRateBuckets(): void {
  rateBuckets.clear();
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

// ---------------------------------------------------------------------------
// requestReset (AUTH-016)
// ---------------------------------------------------------------------------

export function requestReset(input: PasswordResetRequestInput, ip: string): PasswordResetRequestResult {
  const start = Date.now();
  log("info", "RESET_REQUEST_ATTEMPT", { ip });

  if (!input.email || !EMAIL_RE.test(input.email)) {
    log("warn", "RESET_REQUEST_INVALID", { ip, latency_ms: Date.now() - start });
    return { ok: false, code: "VALIDATION_ERROR", message: "A valid email address is required." };
  }

  if (isRateLimited(`reset-req:${ip}`, 5)) {
    log("warn", "RESET_REQUEST_RATE_LIMITED", { ip, latency_ms: Date.now() - start });
    // Still return ok:true to prevent enumeration via rate-limit probing
    return { ok: true };
  }

  try {
    const email = input.email.trim().toLowerCase();
    const account = accountsByEmail.get(email);

    if (account) {
      const token = storeResetToken(account.id);
      // TODO: deliver token via email transport
      log("info", "RESET_REQUESTED", {
        accountId: account.id,
        tokenPrefix: token.slice(0, 8),
        latency_ms: Date.now() - start,
      });
    } else {
      // Unknown email — log quietly, return same response
      log("info", "RESET_REQUEST_UNKNOWN_EMAIL", { latency_ms: Date.now() - start });
    }

    return { ok: true };
  } catch (err) {
    log("error", "RESET_REQUEST_ERROR", {
      ip,
      error: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    });
    return { ok: false, code: "INTERNAL_ERROR", message: "Request failed due to an internal error." };
  }
}

// ---------------------------------------------------------------------------
// confirmReset (AUTH-016)
// ---------------------------------------------------------------------------

export function confirmReset(input: PasswordResetConfirmInput): PasswordResetConfirmResult {
  const start = Date.now();
  const tokenPrefix = input.token ? input.token.slice(0, 8) : "";
  log("info", "RESET_CONFIRM_ATTEMPT", { tokenPrefix });

  if (!input.token || input.token.trim().length === 0) {
    return { ok: false, code: "VALIDATION_ERROR", message: "token is required." };
  }
  if (!input.newPassword || input.newPassword.length < MIN_PASSWORD_LEN) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: `newPassword must be at least ${MIN_PASSWORD_LEN} characters.`,
    };
  }

  if (isRateLimited(`reset-confirm:${input.token}`, 3)) {
    log("warn", "RESET_CONFIRM_RATE_LIMITED", { tokenPrefix, latency_ms: Date.now() - start });
    return { ok: false, code: "INVALID_RESET_TOKEN", message: "Reset token is invalid or has expired." };
  }

  try {
    const entry = resetStore.get(input.token);

    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) resetStore.delete(input.token);
      log("warn", "RESET_CONFIRM_EXPIRED", { tokenPrefix, latency_ms: Date.now() - start });
      return { ok: false, code: "INVALID_RESET_TOKEN", message: "Reset token is invalid or has expired." };
    }

    // Find account and update password
    const account = [...accountsByEmail.values()].find((a) => a.id === entry.accountId);
    if (!account) {
      resetStore.delete(input.token);
      log("warn", "RESET_CONFIRM_NO_ACCOUNT", { accountId: entry.accountId, latency_ms: Date.now() - start });
      return { ok: false, code: "INVALID_RESET_TOKEN", message: "Reset token is invalid or has expired." };
    }

    account.passwordHash = hashPassword(input.newPassword);

    // Single-use: delete reset token
    resetStore.delete(input.token);

    // Revoke all active refresh tokens for this account (force re-login)
    for (const [rt, rtEntry] of refreshStore) {
      if (rtEntry.accountId === entry.accountId) refreshStore.delete(rt);
    }

    log("info", "RESET_CONFIRMED", { accountId: entry.accountId, latency_ms: Date.now() - start });
    return { ok: true };
  } catch (err) {
    log("error", "RESET_CONFIRM_ERROR", {
      tokenPrefix,
      error: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    });
    return { ok: false, code: "INTERNAL_ERROR", message: "Confirm failed due to an internal error." };
  }
}
