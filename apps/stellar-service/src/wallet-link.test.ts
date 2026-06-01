/**
 * AUTH-092 / AUTH-093 — Wallet link, unlink, rotate, and recovery tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/wallet-link.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  link,
  unlink,
  rotate,
  initiateRecovery,
  confirmRecovery,
  walletStore,
  recoveryStore,
  rotateInFlight,
  clearRateBuckets,
  STORE_MAX_SIZE,
  RECOVERY_TTL_MS,
} from "./wallet-link.js";

// Valid 56-char Stellar public key format (G + 55 base32 chars)
const VALID_ADDRESS = "GBVVJJWAKWYMKWMQHWOMTEKOVUA36TYVWRECQ7YGPMXWYE5VWHUWMXNB";
const VALID_ADDRESS_2 = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function resetAll(): void {
  walletStore.clear();
  recoveryStore.clear();
  rotateInFlight.clear();
  clearRateBuckets();
}

beforeEach(resetAll);

// ---------------------------------------------------------------------------
// link — happy path
// ---------------------------------------------------------------------------

describe("link — happy path", () => {
  it("links a wallet and returns ok:true with accountId, walletAddress, linkedAt", () => {
    const result = link({ accountId: "acct-1", walletAddress: VALID_ADDRESS });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.accountId, "acct-1");
    assert.equal(result.walletAddress, VALID_ADDRESS);
    assert.ok(result.linkedAt, "linkedAt is set");
    assert.ok(new Date(result.linkedAt) <= new Date(), "linkedAt is not in the future");
  });

  it("persists the record in walletStore", () => {
    link({ accountId: "acct-2", walletAddress: VALID_ADDRESS });
    assert.ok(walletStore.has("acct-2"));
    assert.equal(walletStore.get("acct-2")?.walletAddress, VALID_ADDRESS);
  });
});

// ---------------------------------------------------------------------------
// link — validation
// ---------------------------------------------------------------------------

describe("link — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = link({ accountId: "", walletAddress: VALID_ADDRESS });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for missing walletAddress", () => {
    const result = link({ accountId: "acct-3", walletAddress: "" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for invalid Stellar address (too short)", () => {
    const result = link({ accountId: "acct-4", walletAddress: "GABC" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for address not starting with G", () => {
    const result = link({ accountId: "acct-5", walletAddress: "S" + "A".repeat(55) });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns ALREADY_LINKED when a wallet is already linked", () => {
    link({ accountId: "acct-6", walletAddress: VALID_ADDRESS });
    const result = link({ accountId: "acct-6", walletAddress: VALID_ADDRESS_2 });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "ALREADY_LINKED");
  });
});

// ---------------------------------------------------------------------------
// link — rate-limit (AUTH-093)
// ---------------------------------------------------------------------------

describe("link — rate-limit (AUTH-093)", () => {
  it("returns RATE_LIMITED after exceeding 5 attempts per accountId", () => {
    for (let i = 0; i < 5; i++) {
      link({ accountId: "acct-rl", walletAddress: VALID_ADDRESS });
    }
    const result = link({ accountId: "acct-rl", walletAddress: VALID_ADDRESS });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "RATE_LIMITED");
  });

  it("rate-limit is per-accountId — different accounts are independent", () => {
    for (let i = 0; i < 5; i++) {
      link({ accountId: "acct-rl2", walletAddress: VALID_ADDRESS });
    }
    // Different account should not be rate-limited
    const result = link({ accountId: "acct-other", walletAddress: VALID_ADDRESS });
    // May fail for other reasons (already linked etc.) but not RATE_LIMITED
    if (!result.ok) {
      assert.notEqual(result.code, "RATE_LIMITED");
    }
  });
});

// ---------------------------------------------------------------------------
// unlink — happy path
// ---------------------------------------------------------------------------

describe("unlink — happy path", () => {
  it("unlinks a wallet and returns ok:true", () => {
    link({ accountId: "acct-7", walletAddress: VALID_ADDRESS });
    const result = unlink({ accountId: "acct-7" });
    assert.equal(result.ok, true);
    assert.equal(walletStore.has("acct-7"), false);
  });

  it("cleans up pending recovery tokens on unlink", () => {
    link({ accountId: "acct-8", walletAddress: VALID_ADDRESS });
    const initResult = initiateRecovery({ accountId: "acct-8" });
    assert.equal(initResult.ok, true);
    if (!initResult.ok) throw new Error("unreachable");
    const token = initResult.recoveryToken;
    unlink({ accountId: "acct-8" });
    assert.equal(recoveryStore.has(token), false, "recovery token cleaned up on unlink");
  });
});

// ---------------------------------------------------------------------------
// unlink — validation
// ---------------------------------------------------------------------------

describe("unlink — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = unlink({ accountId: "" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns NOT_LINKED when no wallet is linked", () => {
    const result = unlink({ accountId: "acct-9" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "NOT_LINKED");
  });
});

// ---------------------------------------------------------------------------
// rotate — happy path
// ---------------------------------------------------------------------------

describe("rotate — happy path", () => {
  it("rotates to a new wallet address and returns ok:true", () => {
    link({ accountId: "acct-10", walletAddress: VALID_ADDRESS });
    const result = rotate({ accountId: "acct-10", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.walletAddress, VALID_ADDRESS_2);
    assert.ok(result.rotatedAt, "rotatedAt is set");
  });

  it("updates the walletStore with the new address", () => {
    link({ accountId: "acct-11", walletAddress: VALID_ADDRESS });
    rotate({ accountId: "acct-11", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(walletStore.get("acct-11")?.walletAddress, VALID_ADDRESS_2);
  });

  it("preserves the original linkedAt timestamp after rotation", () => {
    link({ accountId: "acct-12", walletAddress: VALID_ADDRESS });
    const originalLinkedAt = walletStore.get("acct-12")!.linkedAt;
    rotate({ accountId: "acct-12", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(walletStore.get("acct-12")?.linkedAt, originalLinkedAt);
  });
});

// ---------------------------------------------------------------------------
// rotate — validation
// ---------------------------------------------------------------------------

describe("rotate — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = rotate({ accountId: "", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for invalid new wallet address", () => {
    link({ accountId: "acct-13", walletAddress: VALID_ADDRESS });
    const result = rotate({ accountId: "acct-13", newWalletAddress: "INVALID" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns NOT_LINKED when no wallet is linked", () => {
    const result = rotate({ accountId: "acct-14", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "NOT_LINKED");
  });
});

// ---------------------------------------------------------------------------
// rotate — concurrent-rotation lock (AUTH-093)
// ---------------------------------------------------------------------------

describe("rotate — concurrent-rotation lock (AUTH-093)", () => {
  it("returns INTERNAL_ERROR when a rotation is already in-flight", () => {
    link({ accountId: "acct-15", walletAddress: VALID_ADDRESS });
    rotateInFlight.add("acct-15");
    const result = rotate({ accountId: "acct-15", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INTERNAL_ERROR");
    rotateInFlight.delete("acct-15");
  });

  it("lock is released after a successful rotation", () => {
    link({ accountId: "acct-16", walletAddress: VALID_ADDRESS });
    rotate({ accountId: "acct-16", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(rotateInFlight.has("acct-16"), false, "lock released after success");
  });

  it("lock is released after a failed rotation (not linked)", () => {
    rotate({ accountId: "acct-17", newWalletAddress: VALID_ADDRESS_2 });
    assert.equal(rotateInFlight.has("acct-17"), false, "lock released after failure");
  });
});

// ---------------------------------------------------------------------------
// initiateRecovery — happy path
// ---------------------------------------------------------------------------

describe("initiateRecovery — happy path", () => {
  it("returns ok:true with a recoveryToken and expiresAt", () => {
    const result = initiateRecovery({ accountId: "acct-18" });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.ok(result.recoveryToken.length > 0, "recoveryToken is set");
    assert.ok(new Date(result.expiresAt) > new Date(), "expiresAt is in the future");
  });

  it("stores the recovery token in recoveryStore", () => {
    const result = initiateRecovery({ accountId: "acct-19" });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.ok(recoveryStore.has(result.recoveryToken));
  });

  it("invalidates any previous recovery token when a new one is issued", () => {
    const first = initiateRecovery({ accountId: "acct-20" });
    assert.equal(first.ok, true);
    if (!first.ok) throw new Error("unreachable");
    const firstToken = first.recoveryToken;

    const second = initiateRecovery({ accountId: "acct-20" });
    assert.equal(second.ok, true);
    if (!second.ok) throw new Error("unreachable");

    assert.equal(recoveryStore.has(firstToken), false, "old token invalidated");
    assert.ok(recoveryStore.has(second.recoveryToken), "new token stored");
  });
});

// ---------------------------------------------------------------------------
// initiateRecovery — validation
// ---------------------------------------------------------------------------

describe("initiateRecovery — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = initiateRecovery({ accountId: "" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// confirmRecovery — happy path
// ---------------------------------------------------------------------------

describe("confirmRecovery — happy path", () => {
  it("confirms recovery and sets the new wallet address", () => {
    const init = initiateRecovery({ accountId: "acct-21" });
    assert.equal(init.ok, true);
    if (!init.ok) throw new Error("unreachable");

    const result = confirmRecovery({
      accountId: "acct-21",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.walletAddress, VALID_ADDRESS);
    assert.equal(walletStore.get("acct-21")?.walletAddress, VALID_ADDRESS);
  });

  it("recovery token is consumed (single-use)", () => {
    const init = initiateRecovery({ accountId: "acct-22" });
    assert.equal(init.ok, true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({
      accountId: "acct-22",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });

    // Second use of the same token should fail
    const second = confirmRecovery({
      accountId: "acct-22",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS_2,
    });
    assert.equal(second.ok, false);
    if (second.ok) throw new Error("unreachable");
    assert.equal(second.code, "INVALID_RECOVERY_TOKEN");
  });

  it("preserves original linkedAt when recovering over an existing link", () => {
    link({ accountId: "acct-23", walletAddress: VALID_ADDRESS });
    const originalLinkedAt = walletStore.get("acct-23")!.linkedAt;

    const init = initiateRecovery({ accountId: "acct-23" });
    assert.equal(init.ok, true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({
      accountId: "acct-23",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS_2,
    });

    assert.equal(walletStore.get("acct-23")?.linkedAt, originalLinkedAt);
  });
});

// ---------------------------------------------------------------------------
// confirmRecovery — validation and security (AUTH-093)
// ---------------------------------------------------------------------------

describe("confirmRecovery — validation and security (AUTH-093)", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = confirmRecovery({ accountId: "", recoveryToken: "tok", newWalletAddress: VALID_ADDRESS });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for missing recoveryToken", () => {
    const result = confirmRecovery({ accountId: "acct-24", recoveryToken: "", newWalletAddress: VALID_ADDRESS });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for invalid new wallet address", () => {
    const init = initiateRecovery({ accountId: "acct-25" });
    assert.equal(init.ok, true);
    if (!init.ok) throw new Error("unreachable");
    const result = confirmRecovery({
      accountId: "acct-25",
      recoveryToken: init.recoveryToken,
      newWalletAddress: "INVALID",
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns INVALID_RECOVERY_TOKEN for unknown token", () => {
    const result = confirmRecovery({
      accountId: "acct-26",
      recoveryToken: "00000000-0000-0000-0000-000000000000",
      newWalletAddress: VALID_ADDRESS,
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_RECOVERY_TOKEN");
  });

  it("returns INVALID_RECOVERY_TOKEN when token belongs to a different account (AUTH-093)", () => {
    const init = initiateRecovery({ accountId: "acct-27" });
    assert.equal(init.ok, true);
    if (!init.ok) throw new Error("unreachable");

    // Try to use acct-27's token for acct-28
    const result = confirmRecovery({
      accountId: "acct-28",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_RECOVERY_TOKEN");
    // Token should still be valid for the correct account
    assert.ok(recoveryStore.has(init.recoveryToken), "token not consumed on wrong-account attempt");
  });

  it("returns INVALID_RECOVERY_TOKEN for an expired token (AUTH-093)", () => {
    const accountId = "acct-29";
    const token = "expired-token-uuid-1234567890123456";
    // Manually insert an expired token
    recoveryStore.set(token, { accountId, expiresAt: Date.now() - 1 });

    const result = confirmRecovery({
      accountId,
      recoveryToken: token,
      newWalletAddress: VALID_ADDRESS,
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_RECOVERY_TOKEN");
  });
});

// ---------------------------------------------------------------------------
// Store-size cap (AUTH-093)
// ---------------------------------------------------------------------------

describe("store-size cap (AUTH-093)", () => {
  it("walletStore does not exceed STORE_MAX_SIZE", () => {
    // Fill to capacity
    for (let i = 0; i < STORE_MAX_SIZE; i++) {
      walletStore.set(`acct-cap-${i}`, {
        accountId: `acct-cap-${i}`,
        walletAddress: VALID_ADDRESS,
        linkedAt: new Date().toISOString(),
      });
    }
    assert.equal(walletStore.size, STORE_MAX_SIZE);

    // One more link should evict the oldest
    link({ accountId: "acct-cap-new", walletAddress: VALID_ADDRESS });
    assert.ok(walletStore.size <= STORE_MAX_SIZE, `store size ${walletStore.size} exceeds cap`);
  });
});

// ---------------------------------------------------------------------------
// Recovery TTL constant sanity check
// ---------------------------------------------------------------------------

describe("RECOVERY_TTL_MS", () => {
  it("is 15 minutes", () => {
    assert.equal(RECOVERY_TTL_MS, 15 * 60 * 1000);
  });
});
