/**
 * Session — refresh and logout service (AUTH-012).
 *
 * Design (AUTH-011)
 * -----------------
 * - refresh(): validates refresh token, rotates it (delete old, issue new), returns new TokenPair.
 * - logout(): revokes refresh token; idempotent — unknown tokens still return ok:true.
 * - refreshStore is the single persistence seam; swap Map for a DB adapter when needed.
 *
 * Hardening (AUTH-013)
 * --------------------
 * - Token-length guard: rejects tokens outside the expected UUID length (36 chars).
 * - Concurrent-refresh lock: per-token in-flight set prevents double-spend races.
 * - Store-size cap: refreshStore is bounded to STORE_MAX_SIZE; oldest entry evicted on overflow.
 *
 * Instrumentation (AUTH-014)
 * --------------------------
 * - All log events include accountId (when known), token prefix (first 8 chars), and latency_ms.
 *
 * Lifecycle events
 * ----------------
 *   REFRESH_ATTEMPT  → token received
 *   REFRESH_INVALID  → validation failed
 *   REFRESH_EXPIRED  → token not found or past expiresAt
 *   REFRESH_OK       → new tokens issued
 *   REFRESH_ERROR    → unexpected failure
 *   LOGOUT_OK        → token revoked (or was already absent)
 *   LOGOUT_ERROR     → unexpected failure
 */

import { createHash, randomUUID } from "node:crypto";
import { createStructuredLogger } from "@qyou/config";
import type { LogoutInput, LogoutResult, RefreshInput, RefreshResult, SessionErrorCode, TokenPair } from "@qyou/types";
import { refreshStore } from "./login.js";

// ---------------------------------------------------------------------------
// Structured logger (AUTH-014)
// ---------------------------------------------------------------------------

const log = createStructuredLogger({ service: "api", component: "auth.session" });

/** First 8 chars of a token — safe to log, not enough to replay. */
function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Token helpers (mirrors login.ts — same secret, same algorithm)
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// AUTH-013: cap the in-memory store to prevent unbounded growth
const STORE_MAX_SIZE = 10_000;

function signJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHash("sha256").update(`${header}.${body}.${JWT_SECRET}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function issueTokens(accountId: string): TokenPair {
  const now = Date.now();
  const expiresAt = new Date(now + ACCESS_TTL_MS).toISOString();
  const accessToken = signJwt({
    sub: accountId,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + ACCESS_TTL_MS) / 1000),
  });
  const refreshToken = randomUUID();

  // AUTH-013: evict oldest entry when store is at capacity
  if (refreshStore.size >= STORE_MAX_SIZE) {
    const oldest = refreshStore.keys().next().value;
    if (oldest !== undefined) refreshStore.delete(oldest);
  }

  refreshStore.set(refreshToken, { accountId, expiresAt: now + REFRESH_TTL_MS });
  return { accessToken, expiresAt, refreshToken };
}

// ---------------------------------------------------------------------------
// AUTH-013: Concurrent-refresh lock
// Prevents two simultaneous requests from both consuming the same token.
// ---------------------------------------------------------------------------

const refreshInFlight = new Set<string>();

// ---------------------------------------------------------------------------
// AUTH-013: Token-length guard
// UUID v4 is always 36 characters (8-4-4-4-12 + 4 hyphens).
// ---------------------------------------------------------------------------

const EXPECTED_TOKEN_LENGTH = 36;

function isValidTokenShape(token: string): boolean {
  return token.length === EXPECTED_TOKEN_LENGTH;
}

// ---------------------------------------------------------------------------
// Refresh (AUTH-012 / AUTH-013 / AUTH-014)
// ---------------------------------------------------------------------------

export function refresh(input: RefreshInput): RefreshResult {
  const start = Date.now();
  const prefix = input.refreshToken ? tokenPrefix(input.refreshToken) : "";
  log("info", "REFRESH_ATTEMPT", { tokenPrefix: prefix });

  if (!input.refreshToken || input.refreshToken.trim().length === 0) {
    log("warn", "REFRESH_INVALID", { reason: "empty", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "refreshToken is required.");
  }

  // AUTH-013: reject tokens that cannot be valid UUIDs
  if (!isValidTokenShape(input.refreshToken.trim())) {
    log("warn", "REFRESH_INVALID", { reason: "bad_length", tokenPrefix: prefix, latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "refreshToken format is invalid.");
  }

  // AUTH-013: concurrent-refresh lock
  if (refreshInFlight.has(input.refreshToken)) {
    log("warn", "REFRESH_INVALID", { reason: "in_flight", tokenPrefix: prefix, latency_ms: Date.now() - start });
    return fail("INVALID_REFRESH_TOKEN", "Refresh token is already being processed.");
  }

  refreshInFlight.add(input.refreshToken);
  try {
    const entry = refreshStore.get(input.refreshToken);

    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) refreshStore.delete(input.refreshToken);
      log("warn", "REFRESH_EXPIRED", { tokenPrefix: prefix, latency_ms: Date.now() - start });
      return fail("INVALID_REFRESH_TOKEN", "Refresh token is invalid or has expired.");
    }

    // Rotate: delete old token, issue new pair
    refreshStore.delete(input.refreshToken);
    const tokens = issueTokens(entry.accountId);
    log("info", "REFRESH_OK", {
      accountId: entry.accountId,
      tokenPrefix: prefix,
      newTokenPrefix: tokenPrefix(tokens.refreshToken),
      latency_ms: Date.now() - start,
    });
    return { ok: true, tokens };
  } catch (err) {
    log("error", "REFRESH_ERROR", {
      tokenPrefix: prefix,
      error: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    });
    return fail("INTERNAL_ERROR", "Refresh failed due to an internal error.");
  } finally {
    refreshInFlight.delete(input.refreshToken);
  }
}

// ---------------------------------------------------------------------------
// Logout (AUTH-012 / AUTH-014)
// ---------------------------------------------------------------------------

export function logout(input: LogoutInput): LogoutResult {
  const start = Date.now();
  const prefix = input.refreshToken ? tokenPrefix(input.refreshToken) : "";

  if (!input.refreshToken || input.refreshToken.trim().length === 0) {
    log("warn", "LOGOUT_INVALID", { reason: "empty", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "refreshToken is required.");
  }

  try {
    const entry = refreshStore.get(input.refreshToken);
    const accountId = entry?.accountId;
    // Idempotent: delete regardless of whether token exists
    refreshStore.delete(input.refreshToken);
    log("info", "LOGOUT_OK", { accountId, tokenPrefix: prefix, latency_ms: Date.now() - start });
    return { ok: true };
  } catch (err) {
    log("error", "LOGOUT_ERROR", {
      tokenPrefix: prefix,
      error: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    });
    return fail("INTERNAL_ERROR", "Logout failed due to an internal error.");
  }
}

function fail(code: SessionErrorCode, message: string): { ok: false; code: SessionErrorCode; message: string } {
  return { ok: false, code, message };
}

/** Exposed for tests — lets tests inspect/manipulate the in-flight lock. */
export { refreshInFlight };

/** Exposed for tests — store-size cap constant. */
export { STORE_MAX_SIZE };
