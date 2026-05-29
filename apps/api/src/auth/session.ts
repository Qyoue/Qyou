/**
 * Session — refresh and logout service (AUTH-012).
 *
 * Design (AUTH-011)
 * -----------------
 * - refresh(): validates refresh token, rotates it (delete old, issue new), returns new TokenPair.
 * - logout(): revokes refresh token; idempotent — unknown tokens still return ok:true.
 * - refreshStore is the single persistence seam; swap Map for a DB adapter when needed.
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
import type { LogoutInput, LogoutResult, RefreshInput, RefreshResult, SessionErrorCode, TokenPair } from "@qyou/types";
import { refreshStore } from "./login.js";

// ---------------------------------------------------------------------------
// Structured logger (shared pattern)
// ---------------------------------------------------------------------------

type LogLevel = "info" | "warn" | "error";
function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, event, ...data };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : "log"](JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// Token helpers (mirrors login.ts — same secret, same algorithm)
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  refreshStore.set(refreshToken, { accountId, expiresAt: now + REFRESH_TTL_MS });
  return { accessToken, expiresAt, refreshToken };
}

// ---------------------------------------------------------------------------
// Refresh (AUTH-012)
// ---------------------------------------------------------------------------

export function refresh(input: RefreshInput): RefreshResult {
  log("info", "REFRESH_ATTEMPT");

  if (!input.refreshToken || input.refreshToken.trim().length === 0) {
    log("warn", "REFRESH_INVALID");
    return fail("VALIDATION_ERROR", "refreshToken is required.");
  }

  try {
    const entry = refreshStore.get(input.refreshToken);

    if (!entry || Date.now() > entry.expiresAt) {
      // Clean up expired entry if present
      if (entry) refreshStore.delete(input.refreshToken);
      log("warn", "REFRESH_EXPIRED");
      return fail("INVALID_REFRESH_TOKEN", "Refresh token is invalid or has expired.");
    }

    // Rotate: delete old token, issue new pair
    refreshStore.delete(input.refreshToken);
    const tokens = issueTokens(entry.accountId);
    log("info", "REFRESH_OK", { accountId: entry.accountId });
    return { ok: true, tokens };
  } catch (err) {
    log("error", "REFRESH_ERROR", { error: err instanceof Error ? err.message : String(err) });
    return fail("INTERNAL_ERROR", "Refresh failed due to an internal error.");
  }
}

// ---------------------------------------------------------------------------
// Logout (AUTH-012)
// ---------------------------------------------------------------------------

export function logout(input: LogoutInput): LogoutResult {
  if (!input.refreshToken || input.refreshToken.trim().length === 0) {
    log("warn", "LOGOUT_INVALID");
    return fail("VALIDATION_ERROR", "refreshToken is required.");
  }

  try {
    // Idempotent: delete regardless of whether token exists
    refreshStore.delete(input.refreshToken);
    log("info", "LOGOUT_OK");
    return { ok: true };
  } catch (err) {
    log("error", "LOGOUT_ERROR", { error: err instanceof Error ? err.message : String(err) });
    return fail("INTERNAL_ERROR", "Logout failed due to an internal error.");
  }
}

function fail(code: SessionErrorCode, message: string): { ok: false; code: SessionErrorCode; message: string } {
  return { ok: false, code, message };
}
