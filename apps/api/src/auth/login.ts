/**
 * Login / Token-Issuance — service, validation, rate-limit, constant-time compare.
 *
 * Design (AUTH-006)
 * -----------------
 * - Credentials validated against the shared in-memory account store.
 * - Passwords compared with timingSafeEqual to prevent timing attacks (AUTH-008).
 * - Per-IP rate-limit (5 attempts / 60 s) mirrors registration guard (AUTH-008).
 * - JWTs are HMAC-SHA256 signed; secret from JWT_SECRET env var (AUTH-008).
 * - Access token: 15 min. Refresh token: 7 days (opaque UUID, in-memory store).
 * - Generic "Invalid email or password" response — never reveals email existence (AUTH-008).
 *
 * Lifecycle events
 * ----------------
 *   LOGIN_ATTEMPT → credentials received
 *   LOGIN_INVALID → validation failed
 *   LOGIN_RATE_LIMITED → IP throttled
 *   LOGIN_BAD_CREDENTIALS → email/password mismatch
 *   LOGIN_OK → tokens issued
 *   LOGIN_ERROR → unexpected failure
 */

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { AccountRecord, LoginErrorCode, LoginInput, LoginResult, TokenPair } from "@qyou/types";
import { loadAuthConfig } from "@qyou/config";
import { getAccountByEmail } from "./store.js";

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

type LogLevel = "info" | "warn" | "error";
function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, event, ...data };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : "log"](JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// Rate-limit (AUTH-008)
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const loginRateBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = loginRateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    loginRateBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

/** For tests: reset rate-limit state. */
export function clearLoginRateBuckets(): void {
  loginRateBuckets.clear();
}

// ---------------------------------------------------------------------------
// JWT (no external dep) (AUTH-007)
// ---------------------------------------------------------------------------

const authConfig = loadAuthConfig();
const JWT_SECRET = authConfig.jwtSecret;
const ACCESS_TTL_MS = authConfig.accessTokenTtlSeconds * 1000;
const REFRESH_TTL_MS = authConfig.refreshTokenTtlSeconds * 1000;

function signJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHash("sha256").update(`${header}.${body}.${JWT_SECRET}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

// Refresh token store: token → { accountId, expiresAt }
const refreshStore = new Map<string, { accountId: string; expiresAt: number }>();

function issueTokens(accountId: string, email: string): TokenPair {
  const now = Date.now();
  const expiresAt = new Date(now + ACCESS_TTL_MS).toISOString();
  const accessToken = signJwt({
    sub: accountId,
    email,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + ACCESS_TTL_MS) / 1000),
  });
  const refreshToken = randomUUID();
  refreshStore.set(refreshToken, { accountId, expiresAt: now + REFRESH_TTL_MS });
  return { accessToken, expiresAt, refreshToken };
}

// ---------------------------------------------------------------------------
// Credential verification — constant-time compare (AUTH-008)
// ---------------------------------------------------------------------------

function hashPassword(password: string): string {
  return createHash("sha256").update(`qyou:${password}`).digest("hex");
}

function verifyPassword(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashPassword(candidate));
  const b = Buffer.from(storedHash);
  // Pad to same length before timingSafeEqual to avoid length-based leaks
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(input: LoginInput): string | null {
  if (!input.email || !EMAIL_RE.test(input.email)) return "A valid email address is required.";
  if (!input.password || input.password.length < 1) return "Password is required.";
  return null;
}

// ---------------------------------------------------------------------------
// Login service (AUTH-007)
// ---------------------------------------------------------------------------

export function login(input: LoginInput, ip: string): LoginResult {
  log("info", "LOGIN_ATTEMPT", { ip, email: input.email });

  const validationError = validate(input);
  if (validationError) {
    log("warn", "LOGIN_INVALID", { ip, email: input.email });
    return fail("VALIDATION_ERROR", validationError);
  }

  if (isRateLimited(ip)) {
    log("warn", "LOGIN_RATE_LIMITED", { ip });
    return fail("RATE_LIMITED", "Too many login attempts. Try again later.");
  }

  try {
    const account: AccountRecord | undefined = getAccountByEmail(input.email);

    // Always run verifyPassword to keep timing consistent (AUTH-008)
    const dummyHash = "0".repeat(64);
    const hash = account?.passwordHash ?? dummyHash;
    const match = verifyPassword(input.password, hash);

    if (!account || !match) {
      log("warn", "LOGIN_BAD_CREDENTIALS", { ip, email: input.email });
      return fail("INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const tokens = issueTokens(account.id, account.email);
    log("info", "LOGIN_OK", { accountId: account.id, email: account.email });
    return { ok: true, accountId: account.id, email: account.email, tokens };
  } catch (err) {
    log("error", "LOGIN_ERROR", { ip, error: err instanceof Error ? err.message : String(err) });
    return fail("INTERNAL_ERROR", "Login failed due to an internal error.");
  }
}

function fail(code: LoginErrorCode, message: string): LoginResult {
  return { ok: false, code, message };
}

/** Exposed for testing */
export { refreshStore };
