/**
 * Wallet Link — link, unlink, rotate, and account-recovery service.
 *
 * AUTH-092: Core behaviour
 * ------------------------
 * - link()            Associate a Stellar wallet address with an accountId.
 * - unlink()          Remove the wallet association.
 * - rotate()          Atomically swap to a new wallet address.
 * - initiateRecovery() Issue a short-lived recovery token for a locked-out account.
 * - confirmRecovery()  Consume the recovery token and set a new wallet address.
 *
 * AUTH-093: Hardening
 * -------------------
 * - Stellar address validation (56-char G… public key format).
 * - Per-accountId rate-limit on link/rotate/recovery operations (5 / 60 s).
 * - Recovery tokens are single-use UUIDs with a 15-minute TTL.
 * - Concurrent-rotation lock prevents double-spend races.
 * - Store bounded to STORE_MAX_SIZE; oldest entry evicted on overflow.
 * - All operations emit structured JSON log events with latency_ms.
 *
 * AUTH-094: Instrumentation
 * -------------------------
 * - Unlink logs the previous wallet address for audit trail.
 * - Rotate logs both old and new wallet addresses.
 * - Recovery confirm logs token expiry and address change.
 * - All error paths log a structured reason field for faster diagnosis.
 *
 * AUTH-097: Reward-account readiness
 * ------------------------------------
 * - checkRewardReadiness() evaluates whether an account can receive rewards.
 *
 * Lifecycle events
 * ----------------
 *   WALLET_LINK_ATTEMPT / WALLET_LINK_OK / WALLET_LINK_ERROR
 *   WALLET_UNLINK_ATTEMPT / WALLET_UNLINK_OK / WALLET_UNLINK_ERROR
 *   WALLET_ROTATE_ATTEMPT / WALLET_ROTATE_OK / WALLET_ROTATE_ERROR
 *   WALLET_RECOVERY_INIT_ATTEMPT / WALLET_RECOVERY_INIT_OK / WALLET_RECOVERY_INIT_ERROR
 *   WALLET_RECOVERY_CONFIRM_ATTEMPT / WALLET_RECOVERY_CONFIRM_OK / WALLET_RECOVERY_CONFIRM_ERROR
 *   REWARD_READINESS_CHECK / REWARD_READINESS_RESULT
 */

import { randomUUID } from "node:crypto";
import { createStructuredLogger } from "@qyou/config";
import type {
  WalletLinkErrorCode,
  WalletLinkInput,
  WalletLinkRecord,
  WalletLinkResult,
  WalletRecoveryConfirmInput,
  WalletRecoveryConfirmResult,
  WalletRecoveryInitInput,
  WalletRecoveryInitResult,
  WalletRotateInput,
  WalletRotateResult,
  WalletUnlinkInput,
  WalletUnlinkResult,
  RewardReadinessResult,
} from "@qyou/types";

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

const log = createStructuredLogger({ service: "stellar-service", component: "auth.wallet_link" });

// ---------------------------------------------------------------------------
// In-memory store (AUTH-093: bounded)
// ---------------------------------------------------------------------------

export const STORE_MAX_SIZE = 10_000;

/** Primary store: accountId → WalletLinkRecord */
export const walletStore = new Map<string, WalletLinkRecord>();

/** Recovery token store: recoveryToken → accountId */
const recoveryStore = new Map<string, { accountId: string; expiresAt: number }>();

function evictIfFull(store: Map<string, unknown>): void {
  if (store.size >= STORE_MAX_SIZE) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
}

// ---------------------------------------------------------------------------
// AUTH-093: Per-accountId rate-limit
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(accountId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(accountId);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(accountId, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

/** For tests: reset rate-limit state. */
export function clearRateBuckets(): void {
  rateBuckets.clear();
}

// ---------------------------------------------------------------------------
// AUTH-093: Concurrent-rotation lock
// ---------------------------------------------------------------------------

const rotateInFlight = new Set<string>();

// ---------------------------------------------------------------------------
// AUTH-093: Stellar address validation
// Stellar public keys are 56-character strings starting with 'G'.
// ---------------------------------------------------------------------------

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

function isValidStellarAddress(address: string): boolean {
  return STELLAR_ADDRESS_RE.test(address);
}

// ---------------------------------------------------------------------------
// Recovery token TTL
// ---------------------------------------------------------------------------

const RECOVERY_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(code: WalletLinkErrorCode, message: string): { ok: false; code: WalletLinkErrorCode; message: string } {
  return { ok: false, code, message };
}

function validateAccountId(accountId: unknown): string | null {
  if (!accountId || typeof accountId !== "string" || accountId.trim().length === 0) {
    return "accountId is required.";
  }
  return null;
}

function validateWalletAddress(address: unknown): string | null {
  if (!address || typeof address !== "string" || address.trim().length === 0) {
    return "walletAddress is required.";
  }
  if (!isValidStellarAddress(address.trim())) {
    return "walletAddress must be a valid Stellar public key (56-char G… format).";
  }
  return null;
}

// ---------------------------------------------------------------------------
// link (AUTH-092)
// ---------------------------------------------------------------------------

export function link(input: WalletLinkInput): WalletLinkResult {
  const start = Date.now();
  const accountId = input.accountId?.trim();
  log("info", "WALLET_LINK_ATTEMPT", { accountId });

  const accountErr = validateAccountId(accountId);
  if (accountErr) {
    log("warn", "WALLET_LINK_ERROR", { reason: "invalid_account", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", accountErr);
  }

  const addressErr = validateWalletAddress(input.walletAddress);
  if (addressErr) {
    log("warn", "WALLET_LINK_ERROR", { accountId, reason: "invalid_address", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", addressErr);
  }

  if (isRateLimited(accountId)) {
    log("warn", "WALLET_LINK_ERROR", { accountId, reason: "rate_limited", latency_ms: Date.now() - start });
    return fail("RATE_LIMITED", "Too many wallet operations. Try again later.");
  }

  if (walletStore.has(accountId)) {
    log("warn", "WALLET_LINK_ERROR", { accountId, reason: "already_linked", latency_ms: Date.now() - start });
    return fail("ALREADY_LINKED", "A wallet is already linked to this account. Use rotate to change it.");
  }

  try {
    const walletAddress = input.walletAddress.trim();
    const linkedAt = new Date().toISOString();
    const record: WalletLinkRecord = { accountId, walletAddress, linkedAt };
    evictIfFull(walletStore);
    walletStore.set(accountId, record);
    log("info", "WALLET_LINK_OK", { accountId, walletAddress, latency_ms: Date.now() - start });
    return { ok: true, accountId, walletAddress, linkedAt };
  } catch (err) {
    log("error", "WALLET_LINK_ERROR", { accountId, error: err instanceof Error ? err.message : String(err), latency_ms: Date.now() - start });
    return fail("INTERNAL_ERROR", "Wallet link failed due to an internal error.");
  }
}

// ---------------------------------------------------------------------------
// unlink (AUTH-092 / AUTH-094)
// ---------------------------------------------------------------------------

export function unlink(input: WalletUnlinkInput): WalletUnlinkResult {
  const start = Date.now();
  const accountId = input.accountId?.trim();
  log("info", "WALLET_UNLINK_ATTEMPT", { accountId });

  const accountErr = validateAccountId(accountId);
  if (accountErr) {
    log("warn", "WALLET_UNLINK_ERROR", { reason: "invalid_account", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", accountErr);
  }

  if (!walletStore.has(accountId)) {
    log("warn", "WALLET_UNLINK_ERROR", { accountId, reason: "not_linked", latency_ms: Date.now() - start });
    return fail("NOT_LINKED", "No wallet is linked to this account.");
  }

  try {
    // AUTH-094: capture previous address for audit trail before deletion
    const existing = walletStore.get(accountId)!;
    const previousWalletAddress = existing.walletAddress;
    const linkedAt = existing.linkedAt;

    walletStore.delete(accountId);

    // Clean up any pending recovery tokens for this account
    let recoveryTokensCleaned = 0;
    for (const [token, entry] of recoveryStore) {
      if (entry.accountId === accountId) {
        recoveryStore.delete(token);
        recoveryTokensCleaned++;
      }
    }

    // AUTH-094: structured audit log with previous address and cleanup details
    log("info", "WALLET_UNLINK_OK", {
      accountId,
      previousWalletAddress,
      linkedAt,
      recoveryTokensCleaned,
      latency_ms: Date.now() - start,
    });
    return { ok: true };
  } catch (err) {
    log("error", "WALLET_UNLINK_ERROR", { accountId, error: err instanceof Error ? err.message : String(err), latency_ms: Date.now() - start });
    return fail("INTERNAL_ERROR", "Wallet unlink failed due to an internal error.");
  }
}

// ---------------------------------------------------------------------------
// rotate (AUTH-092 / AUTH-093 / AUTH-094)
// ---------------------------------------------------------------------------

export function rotate(input: WalletRotateInput): WalletRotateResult {
  const start = Date.now();
  const accountId = input.accountId?.trim();
  log("info", "WALLET_ROTATE_ATTEMPT", { accountId });

  const accountErr = validateAccountId(accountId);
  if (accountErr) {
    log("warn", "WALLET_ROTATE_ERROR", { reason: "invalid_account", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", accountErr);
  }

  const addressErr = validateWalletAddress(input.newWalletAddress);
  if (addressErr) {
    log("warn", "WALLET_ROTATE_ERROR", { accountId, reason: "invalid_address", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", addressErr);
  }

  if (isRateLimited(accountId)) {
    log("warn", "WALLET_ROTATE_ERROR", { accountId, reason: "rate_limited", latency_ms: Date.now() - start });
    return fail("RATE_LIMITED", "Too many wallet operations. Try again later.");
  }

  if (!walletStore.has(accountId)) {
    log("warn", "WALLET_ROTATE_ERROR", { accountId, reason: "not_linked", latency_ms: Date.now() - start });
    return fail("NOT_LINKED", "No wallet is linked to this account. Use link first.");
  }

  // AUTH-093: concurrent-rotation lock
  if (rotateInFlight.has(accountId)) {
    log("warn", "WALLET_ROTATE_ERROR", { accountId, reason: "in_flight", latency_ms: Date.now() - start });
    return fail("INTERNAL_ERROR", "A rotation is already in progress for this account.");
  }

  rotateInFlight.add(accountId);
  try {
    const existing = walletStore.get(accountId)!;
    // AUTH-094: capture previous address for audit trail
    const previousWalletAddress = existing.walletAddress;
    const newWalletAddress = input.newWalletAddress.trim();
    const rotatedAt = new Date().toISOString();
    const updated: WalletLinkRecord = {
      ...existing,
      walletAddress: newWalletAddress,
      rotatedAt,
    };
    walletStore.set(accountId, updated);
    // AUTH-094: log both old and new addresses for audit trail
    log("info", "WALLET_ROTATE_OK", {
      accountId,
      previousWalletAddress,
      newWalletAddress,
      rotatedAt,
      latency_ms: Date.now() - start,
    });
    return { ok: true, accountId, walletAddress: newWalletAddress, rotatedAt };
  } catch (err) {
    log("error", "WALLET_ROTATE_ERROR", { accountId, error: err instanceof Error ? err.message : String(err), latency_ms: Date.now() - start });
    return fail("INTERNAL_ERROR", "Wallet rotation failed due to an internal error.");
  } finally {
    rotateInFlight.delete(accountId);
  }
}

// ---------------------------------------------------------------------------
// initiateRecovery (AUTH-092 / AUTH-093 / AUTH-094)
// ---------------------------------------------------------------------------

export function initiateRecovery(input: WalletRecoveryInitInput): WalletRecoveryInitResult {
  const start = Date.now();
  const accountId = input.accountId?.trim();
  log("info", "WALLET_RECOVERY_INIT_ATTEMPT", { accountId });

  const accountErr = validateAccountId(accountId);
  if (accountErr) {
    log("warn", "WALLET_RECOVERY_INIT_ERROR", { reason: "invalid_account", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", accountErr);
  }

  if (isRateLimited(accountId)) {
    log("warn", "WALLET_RECOVERY_INIT_ERROR", { accountId, reason: "rate_limited", latency_ms: Date.now() - start });
    return fail("RATE_LIMITED", "Too many wallet operations. Try again later.");
  }

  try {
    // Invalidate any existing recovery token for this account
    let previousTokensInvalidated = 0;
    for (const [token, entry] of recoveryStore) {
      if (entry.accountId === accountId) {
        recoveryStore.delete(token);
        previousTokensInvalidated++;
      }
    }

    const recoveryToken = randomUUID();
    const expiresAt = Date.now() + RECOVERY_TTL_MS;
    evictIfFull(recoveryStore);
    recoveryStore.set(recoveryToken, { accountId, expiresAt });

    // Persist token reference on the wallet record if one exists
    const record = walletStore.get(accountId);
    if (record) {
      walletStore.set(accountId, { ...record, recoveryToken, recoveryExpiresAt: expiresAt });
    }

    const expiresAtIso = new Date(expiresAt).toISOString();
    // AUTH-094: log token expiry and whether previous tokens were invalidated
    log("info", "WALLET_RECOVERY_INIT_OK", {
      accountId,
      expiresAt: expiresAtIso,
      previousTokensInvalidated,
      hasExistingWallet: !!record,
      latency_ms: Date.now() - start,
    });
    return { ok: true, recoveryToken, expiresAt: expiresAtIso };
  } catch (err) {
    log("error", "WALLET_RECOVERY_INIT_ERROR", { accountId, error: err instanceof Error ? err.message : String(err), latency_ms: Date.now() - start });
    return fail("INTERNAL_ERROR", "Recovery initiation failed due to an internal error.");
  }
}

// ---------------------------------------------------------------------------
// confirmRecovery (AUTH-092 / AUTH-093 / AUTH-094)
// ---------------------------------------------------------------------------

export function confirmRecovery(input: WalletRecoveryConfirmInput): WalletRecoveryConfirmResult {
  const start = Date.now();
  const accountId = input.accountId?.trim();
  log("info", "WALLET_RECOVERY_CONFIRM_ATTEMPT", { accountId });

  const accountErr = validateAccountId(accountId);
  if (accountErr) {
    log("warn", "WALLET_RECOVERY_CONFIRM_ERROR", { reason: "invalid_account", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", accountErr);
  }

  if (!input.recoveryToken || input.recoveryToken.trim().length === 0) {
    log("warn", "WALLET_RECOVERY_CONFIRM_ERROR", { accountId, reason: "missing_token", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "recoveryToken is required.");
  }

  const addressErr = validateWalletAddress(input.newWalletAddress);
  if (addressErr) {
    log("warn", "WALLET_RECOVERY_CONFIRM_ERROR", { accountId, reason: "invalid_address", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", addressErr);
  }

  try {
    const tokenKey = input.recoveryToken.trim();
    const entry = recoveryStore.get(tokenKey);

    // AUTH-093: single-use + expiry check + account binding
    if (!entry || Date.now() > entry.expiresAt || entry.accountId !== accountId) {
      // AUTH-094: log specific failure reason for diagnosis
      const tokenFailReason = !entry
        ? "token_not_found"
        : entry.accountId !== accountId
          ? "token_account_mismatch"
          : "token_expired";
      if (entry && entry.accountId === accountId) recoveryStore.delete(tokenKey);
      log("warn", "WALLET_RECOVERY_CONFIRM_ERROR", {
        accountId,
        reason: "invalid_token",
        tokenFailReason,
        tokenExpired: entry ? Date.now() > entry.expiresAt : null,
        latency_ms: Date.now() - start,
      });
      return fail("INVALID_RECOVERY_TOKEN", "Recovery token is invalid, expired, or does not match this account.");
    }

    // Consume the token (single-use)
    recoveryStore.delete(tokenKey);

    const newWalletAddress = input.newWalletAddress.trim();
    const now = new Date().toISOString();
    const existing = walletStore.get(accountId);
    // AUTH-094: capture previous address for audit trail
    const previousWalletAddress = existing?.walletAddress ?? null;
    const record: WalletLinkRecord = {
      accountId,
      walletAddress: newWalletAddress,
      linkedAt: existing?.linkedAt ?? now,
      rotatedAt: now,
    };
    evictIfFull(walletStore);
    walletStore.set(accountId, record);

    // AUTH-094: log address change and whether this was a recovery over an existing link
    log("info", "WALLET_RECOVERY_CONFIRM_OK", {
      accountId,
      previousWalletAddress,
      newWalletAddress,
      recoveredOverExistingLink: !!existing,
      latency_ms: Date.now() - start,
    });
    return { ok: true, accountId, walletAddress: newWalletAddress };
  } catch (err) {
    log("error", "WALLET_RECOVERY_CONFIRM_ERROR", { accountId, error: err instanceof Error ? err.message : String(err), latency_ms: Date.now() - start });
    return fail("INTERNAL_ERROR", "Recovery confirmation failed due to an internal error.");
  }
}

// ---------------------------------------------------------------------------
// checkRewardReadiness (AUTH-097)
// ---------------------------------------------------------------------------

/**
 * Evaluate whether an account is ready to receive Stellar-backed rewards.
 *
 * Criteria (all must pass):
 *  1. A wallet address is linked.
 *  2. The linked address passes Stellar format validation.
 *  3. No active (unexpired) recovery is in progress.
 *
 * This is a pure read — it does not mutate state or make network calls.
 */
export function checkRewardReadiness(accountId: string): RewardReadinessResult {
  const trimmed = accountId?.trim();
  log("info", "REWARD_READINESS_CHECK", { accountId: trimmed });

  const record = walletStore.get(trimmed);

  if (!record) {
    log("info", "REWARD_READINESS_RESULT", { accountId: trimmed, ready: false, reason: "NO_WALLET_LINKED" });
    return { ready: false, accountId: trimmed, reason: "NO_WALLET_LINKED" };
  }

  if (!isValidStellarAddress(record.walletAddress)) {
    log("warn", "REWARD_READINESS_RESULT", { accountId: trimmed, ready: false, reason: "INVALID_ADDRESS" });
    return { ready: false, accountId: trimmed, reason: "INVALID_ADDRESS" };
  }

  // Check for an active (unexpired) recovery token
  if (record.recoveryToken && record.recoveryExpiresAt && Date.now() < record.recoveryExpiresAt) {
    log("info", "REWARD_READINESS_RESULT", { accountId: trimmed, ready: false, reason: "RECOVERY_IN_PROGRESS" });
    return { ready: false, accountId: trimmed, reason: "RECOVERY_IN_PROGRESS" };
  }

  log("info", "REWARD_READINESS_RESULT", { accountId: trimmed, ready: true, walletAddress: record.walletAddress });
  return { ready: true, accountId: trimmed, walletAddress: record.walletAddress };
}

// ---------------------------------------------------------------------------
// Exports for tests
// ---------------------------------------------------------------------------

export { recoveryStore, rotateInFlight, RECOVERY_TTL_MS };
