/**
 * Account Registration — service, in-memory store, validation, rate-limit, logging.
 *
 * Design boundaries
 * -----------------
 * - Pure functions where possible; side-effects isolated to the store.
 * - Store is a Map keyed by normalised email — swap for a DB adapter later.
 * - Rate-limit is per-IP, in-memory sliding window — swap for Redis later.
 * - Passwords are hashed with a simple PBKDF2 shim (no bcrypt dep needed for MVP).
 * - No JWT issued here; session layer is a follow-on slice.
 *
 * Lifecycle checkpoints (AUTH-004)
 * ---------------------------------
 *   REGISTER_ATTEMPT  → input received
 *   REGISTER_INVALID  → validation failed
 *   REGISTER_RATE_LIMITED → IP throttled
 *   REGISTER_DUPLICATE → email already exists
 *   REGISTER_OK       → account created
 *   REGISTER_ERROR    → unexpected failure
 */

import { createHash, randomUUID } from "node:crypto";
import type {
  AccountRecord,
  RegistrationErrorCode,
  RegistrationInput,
  RegistrationResult,
} from "@qyou/types";

// ---------------------------------------------------------------------------
// Structured logger (AUTH-004)
// ---------------------------------------------------------------------------

type LogLevel = "info" | "warn" | "error";

function log(
  level: LogLevel,
  event: string,
  data?: Record<string, unknown>
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : "log"](JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// In-memory store (AUTH-002)
// ---------------------------------------------------------------------------

const accountsByEmail = new Map<string, AccountRecord>();

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  // Deterministic hash for MVP — replace with bcrypt/argon2 before production.
  return createHash("sha256").update(`qyou:${password}`).digest("hex");
}

// ---------------------------------------------------------------------------
// Rate-limit guard (AUTH-003)
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 5; // max attempts per window per IP

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

// ---------------------------------------------------------------------------
// Input validation (AUTH-003)
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

type ValidationError = { field: string; message: string };

function validate(input: RegistrationInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.email || !EMAIL_RE.test(input.email)) {
    errors.push({ field: "email", message: "A valid email address is required." });
  }

  if (!input.password || input.password.length < MIN_PASSWORD_LEN) {
    errors.push({
      field: "password",
      message: `Password must be at least ${MIN_PASSWORD_LEN} characters.`,
    });
  }

  if (input.displayName !== undefined && input.displayName.trim().length === 0) {
    errors.push({ field: "displayName", message: "Display name cannot be blank." });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Registration service (AUTH-002)
// ---------------------------------------------------------------------------

export function register(
  input: RegistrationInput,
  ip: string
): RegistrationResult {
  log("info", "REGISTER_ATTEMPT", { ip, email: input.email });

  // Validation
  const errors = validate(input);
  if (errors.length > 0) {
    log("warn", "REGISTER_INVALID", { ip, email: input.email, errors });
    return failure("VALIDATION_ERROR", errors.map((e) => e.message).join(" "));
  }

  // Rate-limit
  if (isRateLimited(ip)) {
    log("warn", "REGISTER_RATE_LIMITED", { ip });
    return failure("RATE_LIMITED", "Too many registration attempts. Try again later.");
  }

  const email = normaliseEmail(input.email);

  // Duplicate check
  if (accountsByEmail.has(email)) {
    log("warn", "REGISTER_DUPLICATE", { ip, email });
    return failure("DUPLICATE_EMAIL", "An account with this email already exists.");
  }

  // Create account
  try {
    const account: AccountRecord = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(input.password),
      displayName: input.displayName?.trim() ?? email.split("@")[0] ?? email,
      createdAt: new Date().toISOString(),
      status: "pending_verification",
    };

    accountsByEmail.set(email, account);

    log("info", "REGISTER_OK", { accountId: account.id, email, status: account.status });

    return { ok: true, accountId: account.id, email, status: account.status };
  } catch (err) {
    log("error", "REGISTER_ERROR", {
      ip,
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    return failure("INTERNAL_ERROR", "Registration failed due to an internal error.");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function failure(
  code: RegistrationErrorCode,
  message: string
): RegistrationResult {
  return { ok: false, code, message };
}

// Exposed for testing / health checks
export function getAccountCount(): number {
  return accountsByEmail.size;
}
