/**
 * AUTH-082 — Signed challenge verification tests.
 *
 * Run with:
 *   npx jest src/challenge-verify.test.ts
 */

import { describe, it, beforeEach } from "@jest/globals";
import { Keypair } from "@stellar/stellar-sdk";
import {
  issueChallenge,
  verifyChallenge,
  challengeStore,
  clearChallengeStore,
  CHALLENGE_TTL_MS,
} from "./challenge-verify.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// A real Stellar keypair so we can produce valid signatures in tests.
const keypair = Keypair.random();
const VALID_ADDRESS = keypair.publicKey();

// A second keypair for mismatch / wrong-key tests.
const otherKeypair = Keypair.random();
const OTHER_ADDRESS = otherKeypair.publicKey();

function signNonce(nonce: string, kp: Keypair = keypair): string {
  const nonceBytes = Buffer.from(nonce, "hex");
  return kp.sign(nonceBytes).toString("base64");
}

beforeEach(() => clearChallengeStore());

// ---------------------------------------------------------------------------
// issueChallenge — happy path
// ---------------------------------------------------------------------------

describe("issueChallenge — happy path", () => {
  it("returns ok:true with challengeId, nonce, and expiresAt", () => {
    const result = issueChallenge({ walletAddress: VALID_ADDRESS });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.challengeId).toBeTruthy();
    expect(result.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("stores the challenge in challengeStore", () => {
    const result = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!result.ok) throw new Error("unreachable");
    expect(challengeStore.has(result.challengeId)).toBe(true);
    expect(challengeStore.get(result.challengeId)?.walletAddress).toBe(VALID_ADDRESS);
  });

  it("stores challenge as unused", () => {
    const result = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!result.ok) throw new Error("unreachable");
    expect(challengeStore.get(result.challengeId)?.used).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// issueChallenge — validation
// ---------------------------------------------------------------------------

describe("issueChallenge — validation", () => {
  it("returns VALIDATION_ERROR for missing walletAddress", () => {
    const result = issueChallenge({ walletAddress: "" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for invalid Stellar address", () => {
    const result = issueChallenge({ walletAddress: "NOTASTELLARKEY" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns RATE_LIMITED after exceeding 5 attempts per address", () => {
    for (let i = 0; i < 5; i++) {
      issueChallenge({ walletAddress: VALID_ADDRESS });
    }
    const result = issueChallenge({ walletAddress: VALID_ADDRESS });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("RATE_LIMITED");
  });
});

// ---------------------------------------------------------------------------
// verifyChallenge — happy path
// ---------------------------------------------------------------------------

describe("verifyChallenge — happy path", () => {
  it("returns ok:true with walletAddress and verifiedAt for a valid signature", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");

    const result = verifyChallenge({
      challengeId: issued.challengeId,
      walletAddress: VALID_ADDRESS,
      signature: signNonce(issued.nonce),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.walletAddress).toBe(VALID_ADDRESS);
    expect(new Date(result.verifiedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("marks the challenge as used after successful verification", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");

    verifyChallenge({
      challengeId: issued.challengeId,
      walletAddress: VALID_ADDRESS,
      signature: signNonce(issued.nonce),
    });

    expect(challengeStore.get(issued.challengeId)?.used).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// verifyChallenge — validation
// ---------------------------------------------------------------------------

describe("verifyChallenge — validation", () => {
  it("returns VALIDATION_ERROR for missing challengeId", () => {
    const result = verifyChallenge({ challengeId: "", walletAddress: VALID_ADDRESS, signature: "sig" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for missing walletAddress", () => {
    const result = verifyChallenge({ challengeId: "id", walletAddress: "", signature: "sig" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for missing signature", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");
    const result = verifyChallenge({ challengeId: issued.challengeId, walletAddress: VALID_ADDRESS, signature: "" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// verifyChallenge — not found
// ---------------------------------------------------------------------------

describe("verifyChallenge — not found", () => {
  it("returns CHALLENGE_NOT_FOUND for an unknown challengeId", () => {
    const result = verifyChallenge({
      challengeId: "00000000-0000-0000-0000-000000000000",
      walletAddress: VALID_ADDRESS,
      signature: "sig",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("CHALLENGE_NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// verifyChallenge — expiry
// ---------------------------------------------------------------------------

describe("verifyChallenge — expiry", () => {
  it("returns CHALLENGE_EXPIRED when the challenge TTL has elapsed", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");

    // Manually expire the record.
    const record = challengeStore.get(issued.challengeId)!;
    record.expiresAt = Date.now() - 1;

    const result = verifyChallenge({
      challengeId: issued.challengeId,
      walletAddress: VALID_ADDRESS,
      signature: signNonce(issued.nonce),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("CHALLENGE_EXPIRED");
  });
});

// ---------------------------------------------------------------------------
// verifyChallenge — replay
// ---------------------------------------------------------------------------

describe("verifyChallenge — replay", () => {
  it("returns CHALLENGE_ALREADY_USED on a second verify attempt", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");
    const sig = signNonce(issued.nonce);

    verifyChallenge({ challengeId: issued.challengeId, walletAddress: VALID_ADDRESS, signature: sig });
    const replay = verifyChallenge({ challengeId: issued.challengeId, walletAddress: VALID_ADDRESS, signature: sig });

    expect(replay.ok).toBe(false);
    if (replay.ok) throw new Error("unreachable");
    expect(replay.code).toBe("CHALLENGE_ALREADY_USED");
  });
});

// ---------------------------------------------------------------------------
// verifyChallenge — address mismatch
// ---------------------------------------------------------------------------

describe("verifyChallenge — address mismatch", () => {
  it("returns ADDRESS_MISMATCH when walletAddress differs from the issued challenge", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");

    const result = verifyChallenge({
      challengeId: issued.challengeId,
      walletAddress: OTHER_ADDRESS,
      signature: signNonce(issued.nonce, otherKeypair),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("ADDRESS_MISMATCH");
  });
});

// ---------------------------------------------------------------------------
// verifyChallenge — invalid signature
// ---------------------------------------------------------------------------

describe("verifyChallenge — invalid signature", () => {
  it("returns INVALID_SIGNATURE when the signature is wrong", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");

    // Sign with the wrong key.
    const result = verifyChallenge({
      challengeId: issued.challengeId,
      walletAddress: VALID_ADDRESS,
      signature: signNonce(issued.nonce, otherKeypair),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("INVALID_SIGNATURE");
  });

  it("returns INVALID_SIGNATURE for a malformed base64 signature", () => {
    const issued = issueChallenge({ walletAddress: VALID_ADDRESS });
    if (!issued.ok) throw new Error("unreachable");

    const result = verifyChallenge({
      challengeId: issued.challengeId,
      walletAddress: VALID_ADDRESS,
      signature: "not-valid-base64!!!",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("INVALID_SIGNATURE");
  });
});
