/**
 * Signed Challenge Verification — AUTH-082
 *
 * issueChallenge()  — Generate a short-lived nonce for a Stellar wallet address.
 * verifyChallenge() — Verify an Ed25519 signature over the nonce.
 *
 * Security properties
 * -------------------
 * - Challenges are single-use (replay → CHALLENGE_ALREADY_USED).
 * - Challenges expire after CHALLENGE_TTL_MS (5 minutes).
 * - walletAddress in the verify call must match the issued challenge.
 * - Signature is verified with @stellar/stellar-sdk Keypair.verify (Ed25519).
 * - Per-address rate-limit on issue (5 / 60 s).
 * - Store bounded to STORE_MAX_SIZE; oldest entry evicted on overflow.
 */

import { randomBytes, randomUUID } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { createStructuredLogger } from "@qyou/config";
import type {
  ChallengeIssueInput,
  ChallengeIssueResult,
  ChallengeVerifyInput,
  ChallengeVerifyResult,
  ChallengeErrorCode,
  ChallengeRecord,
} from "@qyou/types";

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

const log = createStructuredLogger({ service: "stellar-service", component: "auth.challenge_verify" });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const STORE_MAX_SIZE = 10_000;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

/** challengeId → ChallengeRecord */
export const challengeStore = new Map<string, ChallengeRecord>();

const rateBuckets = new Map<string, { count: number; windowStart: number }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

function isValidStellarAddress(address: string): boolean {
  return STELLAR_ADDRESS_RE.test(address);
}

function fail(
  code: ChallengeErrorCode,
  message: string
): { ok: false; code: ChallengeErrorCode; message: string } {
  return { ok: false, code, message };
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

function evictIfFull(): void {
  if (challengeStore.size >= STORE_MAX_SIZE) {
    const oldest = challengeStore.keys().next().value;
    if (oldest !== undefined) challengeStore.delete(oldest);
  }
}

/** For tests: reset all state. */
export function clearChallengeStore(): void {
  challengeStore.clear();
  rateBuckets.clear();
}

// ---------------------------------------------------------------------------
// issueChallenge
// ---------------------------------------------------------------------------

/**
 * Issue a challenge nonce for a Stellar wallet address.
 *
 * Returns { ok: true, challengeId, nonce, expiresAt } on success.
 */
export function issueChallenge(input: ChallengeIssueInput): ChallengeIssueResult {
  const start = Date.now();
  const walletAddress = input.walletAddress?.trim();
  log("info", "CHALLENGE_ISSUE_ATTEMPT", { walletAddress });

  if (!walletAddress) {
    log("warn", "CHALLENGE_ISSUE_ERROR", { reason: "missing_address", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "walletAddress is required.");
  }

  if (!isValidStellarAddress(walletAddress)) {
    log("warn", "CHALLENGE_ISSUE_ERROR", { reason: "invalid_address", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "walletAddress must be a valid Stellar public key (56-char G… format).");
  }

  if (isRateLimited(walletAddress)) {
    log("warn", "CHALLENGE_ISSUE_ERROR", { walletAddress, reason: "rate_limited", latency_ms: Date.now() - start });
    return fail("RATE_LIMITED", "Too many challenge requests. Try again later.");
  }

  try {
    const challengeId = randomUUID();
    const nonce = randomBytes(32).toString("hex");
    const issuedAt = new Date().toISOString();
    const expiresAt = Date.now() + CHALLENGE_TTL_MS;

    const record: ChallengeRecord = {
      challengeId,
      nonce,
      walletAddress,
      issuedAt,
      expiresAt,
      used: false,
    };

    evictIfFull();
    challengeStore.set(challengeId, record);

    log("info", "CHALLENGE_ISSUE_OK", { challengeId, walletAddress, latency_ms: Date.now() - start });
    return {
      ok: true,
      challengeId,
      nonce,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  } catch (err) {
    log("error", "CHALLENGE_ISSUE_ERROR", {
      walletAddress,
      error: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    });
    return fail("INTERNAL_ERROR", "Failed to issue challenge.");
  }
}

// ---------------------------------------------------------------------------
// verifyChallenge
// ---------------------------------------------------------------------------

/**
 * Verify an Ed25519 signature over the challenge nonce.
 *
 * The signature must be a base64-encoded Ed25519 signature of the nonce bytes
 * (nonce decoded from hex), produced by the Stellar keypair for walletAddress.
 */
export function verifyChallenge(input: ChallengeVerifyInput): ChallengeVerifyResult {
  const start = Date.now();
  const { challengeId, signature } = input;
  const walletAddress = input.walletAddress?.trim();
  log("info", "CHALLENGE_VERIFY_ATTEMPT", { challengeId, walletAddress });

  // --- Input validation ---
  if (!challengeId || typeof challengeId !== "string") {
    log("warn", "CHALLENGE_VERIFY_ERROR", { reason: "missing_challenge_id", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "challengeId is required.");
  }
  if (!walletAddress) {
    log("warn", "CHALLENGE_VERIFY_ERROR", { reason: "missing_address", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "walletAddress is required.");
  }
  if (!isValidStellarAddress(walletAddress)) {
    log("warn", "CHALLENGE_VERIFY_ERROR", { reason: "invalid_address", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "walletAddress must be a valid Stellar public key.");
  }
  if (!signature || typeof signature !== "string") {
    log("warn", "CHALLENGE_VERIFY_ERROR", { reason: "missing_signature", latency_ms: Date.now() - start });
    return fail("VALIDATION_ERROR", "signature is required.");
  }

  // --- Look up challenge ---
  const record = challengeStore.get(challengeId);
  if (!record) {
    log("warn", "CHALLENGE_VERIFY_ERROR", { challengeId, reason: "not_found", latency_ms: Date.now() - start });
    return fail("CHALLENGE_NOT_FOUND", "Challenge not found.");
  }

  // --- Expiry check ---
  if (Date.now() > record.expiresAt) {
    log("warn", "CHALLENGE_VERIFY_ERROR", { challengeId, reason: "expired", latency_ms: Date.now() - start });
    return fail("CHALLENGE_EXPIRED", "Challenge has expired. Please request a new one.");
  }

  // --- Single-use check ---
  if (record.used) {
    log("warn", "CHALLENGE_VERIFY_ERROR", { challengeId, reason: "already_used", latency_ms: Date.now() - start });
    return fail("CHALLENGE_ALREADY_USED", "Challenge has already been used.");
  }

  // --- Address match ---
  if (record.walletAddress !== walletAddress) {
    log("warn", "CHALLENGE_VERIFY_ERROR", {
      challengeId,
      reason: "address_mismatch",
      expected: record.walletAddress,
      got: walletAddress,
      latency_ms: Date.now() - start,
    });
    return fail("ADDRESS_MISMATCH", "walletAddress does not match the issued challenge.");
  }

  // --- Signature verification ---
  try {
    const keypair = Keypair.fromPublicKey(walletAddress);
    const nonceBytes = Buffer.from(record.nonce, "hex");
    const sigBytes = Buffer.from(signature, "base64");
    const valid = keypair.verify(nonceBytes, sigBytes);

    if (!valid) {
      log("warn", "CHALLENGE_VERIFY_ERROR", { challengeId, reason: "invalid_signature", latency_ms: Date.now() - start });
      return fail("INVALID_SIGNATURE", "Signature verification failed.");
    }
  } catch (err) {
    log("warn", "CHALLENGE_VERIFY_ERROR", {
      challengeId,
      reason: "signature_error",
      error: err instanceof Error ? err.message : String(err),
      latency_ms: Date.now() - start,
    });
    return fail("INVALID_SIGNATURE", "Signature verification failed.");
  }

  // --- Mark used ---
  record.used = true;
  const verifiedAt = new Date().toISOString();

  log("info", "CHALLENGE_VERIFY_OK", { challengeId, walletAddress, latency_ms: Date.now() - start });
  return { ok: true, walletAddress, verifiedAt };
}
