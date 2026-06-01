/**
 * AUTH-092 / AUTH-093 / AUTH-094 / AUTH-095 / AUTH-097 — Wallet link tests.
 *
 * Run with:
 *   npm test --workspace @qyou/stellar-service
 */

import {
  link,
  unlink,
  rotate,
  initiateRecovery,
  confirmRecovery,
  checkRewardReadiness,
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
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.accountId).toBe("acct-1");
    expect(result.walletAddress).toBe(VALID_ADDRESS);
    expect(result.linkedAt).toBeTruthy(); // linkedAt is set
    expect(new Date(result.linkedAt) <= new Date()).toBeTruthy(); // linkedAt is not in the future
  });

  it("persists the record in walletStore", () => {
    link({ accountId: "acct-2", walletAddress: VALID_ADDRESS });
    expect(walletStore.has("acct-2")).toBeTruthy();
    expect(walletStore.get("acct-2")?.walletAddress).toBe(VALID_ADDRESS);
  });
});

// ---------------------------------------------------------------------------
// link — validation
// ---------------------------------------------------------------------------

describe("link — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = link({ accountId: "", walletAddress: VALID_ADDRESS });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for missing walletAddress", () => {
    const result = link({ accountId: "acct-3", walletAddress: "" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for invalid Stellar address (too short)", () => {
    const result = link({ accountId: "acct-4", walletAddress: "GABC" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for address not starting with G", () => {
    const result = link({ accountId: "acct-5", walletAddress: "S" + "A".repeat(55) });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns ALREADY_LINKED when a wallet is already linked", () => {
    link({ accountId: "acct-6", walletAddress: VALID_ADDRESS });
    const result = link({ accountId: "acct-6", walletAddress: VALID_ADDRESS_2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("ALREADY_LINKED");
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
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("RATE_LIMITED");
  });

  it("rate-limit is per-accountId — different accounts are independent", () => {
    for (let i = 0; i < 5; i++) {
      link({ accountId: "acct-rl2", walletAddress: VALID_ADDRESS });
    }
    const result = link({ accountId: "acct-other", walletAddress: VALID_ADDRESS });
    if (!result.ok) {
      expect(result.code).not.toBe("RATE_LIMITED");
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
    expect(result.ok).toBe(true);
    expect(walletStore.has("acct-7")).toBe(false);
  });

  it("cleans up pending recovery tokens on unlink", () => {
    link({ accountId: "acct-8", walletAddress: VALID_ADDRESS });
    const initResult = initiateRecovery({ accountId: "acct-8" });
    expect(initResult.ok).toBe(true);
    if (!initResult.ok) throw new Error("unreachable");
    const token = initResult.recoveryToken;
    unlink({ accountId: "acct-8" });
    expect(recoveryStore.has(token)).toBe(false); // recovery token cleaned up on unlink
  });
});

// ---------------------------------------------------------------------------
// unlink — validation
// ---------------------------------------------------------------------------

describe("unlink — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = unlink({ accountId: "" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns NOT_LINKED when no wallet is linked", () => {
    const result = unlink({ accountId: "acct-9" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("NOT_LINKED");
  });
});

// ---------------------------------------------------------------------------
// rotate — happy path
// ---------------------------------------------------------------------------

describe("rotate — happy path", () => {
  it("rotates to a new wallet address and returns ok:true", () => {
    link({ accountId: "acct-10", walletAddress: VALID_ADDRESS });
    const result = rotate({ accountId: "acct-10", newWalletAddress: VALID_ADDRESS_2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.walletAddress).toBe(VALID_ADDRESS_2);
    expect(result.rotatedAt).toBeTruthy(); // rotatedAt is set
  });

  it("updates the walletStore with the new address", () => {
    link({ accountId: "acct-11", walletAddress: VALID_ADDRESS });
    rotate({ accountId: "acct-11", newWalletAddress: VALID_ADDRESS_2 });
    expect(walletStore.get("acct-11")?.walletAddress).toBe(VALID_ADDRESS_2);
  });

  it("preserves the original linkedAt timestamp after rotation", () => {
    link({ accountId: "acct-12", walletAddress: VALID_ADDRESS });
    const originalLinkedAt = walletStore.get("acct-12")!.linkedAt;
    rotate({ accountId: "acct-12", newWalletAddress: VALID_ADDRESS_2 });
    expect(walletStore.get("acct-12")?.linkedAt).toBe(originalLinkedAt);
  });
});

// ---------------------------------------------------------------------------
// rotate — validation
// ---------------------------------------------------------------------------

describe("rotate — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = rotate({ accountId: "", newWalletAddress: VALID_ADDRESS_2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for invalid new wallet address", () => {
    link({ accountId: "acct-13", walletAddress: VALID_ADDRESS });
    const result = rotate({ accountId: "acct-13", newWalletAddress: "INVALID" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns NOT_LINKED when no wallet is linked", () => {
    const result = rotate({ accountId: "acct-14", newWalletAddress: VALID_ADDRESS_2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("NOT_LINKED");
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
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("INTERNAL_ERROR");
    rotateInFlight.delete("acct-15");
  });

  it("lock is released after a successful rotation", () => {
    link({ accountId: "acct-16", walletAddress: VALID_ADDRESS });
    rotate({ accountId: "acct-16", newWalletAddress: VALID_ADDRESS_2 });
    expect(rotateInFlight.has("acct-16")).toBe(false); // lock released after success
  });

  it("lock is released after a failed rotation (not linked)", () => {
    rotate({ accountId: "acct-17", newWalletAddress: VALID_ADDRESS_2 });
    expect(rotateInFlight.has("acct-17")).toBe(false); // lock released after failure
  });
});

// ---------------------------------------------------------------------------
// initiateRecovery — happy path
// ---------------------------------------------------------------------------

describe("initiateRecovery — happy path", () => {
  it("returns ok:true with a recoveryToken and expiresAt", () => {
    const result = initiateRecovery({ accountId: "acct-18" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.recoveryToken.length > 0).toBeTruthy(); // recoveryToken is set
    expect(new Date(result.expiresAt) > new Date()).toBeTruthy(); // expiresAt is in the future
  });

  it("stores the recovery token in recoveryStore", () => {
    const result = initiateRecovery({ accountId: "acct-19" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(recoveryStore.has(result.recoveryToken)).toBeTruthy();
  });

  it("invalidates any previous recovery token when a new one is issued", () => {
    const first = initiateRecovery({ accountId: "acct-20" });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("unreachable");
    const firstToken = first.recoveryToken;

    const second = initiateRecovery({ accountId: "acct-20" });
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("unreachable");

    expect(recoveryStore.has(firstToken)).toBe(false); // old token invalidated
    expect(recoveryStore.has(second.recoveryToken)).toBeTruthy(); // new token stored
  });
});

// ---------------------------------------------------------------------------
// initiateRecovery — validation
// ---------------------------------------------------------------------------

describe("initiateRecovery — validation", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = initiateRecovery({ accountId: "" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// confirmRecovery — happy path
// ---------------------------------------------------------------------------

describe("confirmRecovery — happy path", () => {
  it("confirms recovery and sets the new wallet address", () => {
    const init = initiateRecovery({ accountId: "acct-21" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    const result = confirmRecovery({
      accountId: "acct-21",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.walletAddress).toBe(VALID_ADDRESS);
    expect(walletStore.get("acct-21")?.walletAddress).toBe(VALID_ADDRESS);
  });

  it("recovery token is consumed (single-use)", () => {
    const init = initiateRecovery({ accountId: "acct-22" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({
      accountId: "acct-22",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });

    const second = confirmRecovery({
      accountId: "acct-22",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS_2,
    });
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("unreachable");
    expect(second.code).toBe("INVALID_RECOVERY_TOKEN");
  });

  it("preserves original linkedAt when recovering over an existing link", () => {
    link({ accountId: "acct-23", walletAddress: VALID_ADDRESS });
    const originalLinkedAt = walletStore.get("acct-23")!.linkedAt;

    const init = initiateRecovery({ accountId: "acct-23" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({
      accountId: "acct-23",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS_2,
    });

    expect(walletStore.get("acct-23")?.linkedAt).toBe(originalLinkedAt);
  });
});

// ---------------------------------------------------------------------------
// confirmRecovery — validation and security (AUTH-093)
// ---------------------------------------------------------------------------

describe("confirmRecovery — validation and security (AUTH-093)", () => {
  it("returns VALIDATION_ERROR for missing accountId", () => {
    const result = confirmRecovery({ accountId: "", recoveryToken: "tok", newWalletAddress: VALID_ADDRESS });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for missing recoveryToken", () => {
    const result = confirmRecovery({ accountId: "acct-24", recoveryToken: "", newWalletAddress: VALID_ADDRESS });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for invalid new wallet address", () => {
    const init = initiateRecovery({ accountId: "acct-25" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");
    const result = confirmRecovery({
      accountId: "acct-25",
      recoveryToken: init.recoveryToken,
      newWalletAddress: "INVALID",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("returns INVALID_RECOVERY_TOKEN for unknown token", () => {
    const result = confirmRecovery({
      accountId: "acct-26",
      recoveryToken: "00000000-0000-0000-0000-000000000000",
      newWalletAddress: VALID_ADDRESS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("INVALID_RECOVERY_TOKEN");
  });

  it("returns INVALID_RECOVERY_TOKEN when token belongs to a different account (AUTH-093)", () => {
    const init = initiateRecovery({ accountId: "acct-27" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    const result = confirmRecovery({
      accountId: "acct-28",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("INVALID_RECOVERY_TOKEN");
    expect(recoveryStore.has(init.recoveryToken)).toBeTruthy(); // token not consumed on wrong-account attempt
  });

  it("returns INVALID_RECOVERY_TOKEN for an expired token (AUTH-093)", () => {
    const accountId = "acct-29";
    const token = "expired-token-uuid-1234567890123456";
    recoveryStore.set(token, { accountId, expiresAt: Date.now() - 1 });

    const result = confirmRecovery({
      accountId,
      recoveryToken: token,
      newWalletAddress: VALID_ADDRESS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.code).toBe("INVALID_RECOVERY_TOKEN");
  });
});

// ---------------------------------------------------------------------------
// Store-size cap (AUTH-093)
// ---------------------------------------------------------------------------

describe("store-size cap (AUTH-093)", () => {
  it("walletStore does not exceed STORE_MAX_SIZE", () => {
    for (let i = 0; i < STORE_MAX_SIZE; i++) {
      walletStore.set(`acct-cap-${i}`, {
        accountId: `acct-cap-${i}`,
        walletAddress: VALID_ADDRESS,
        linkedAt: new Date().toISOString(),
      });
    }
    expect(walletStore.size).toBe(STORE_MAX_SIZE);

    link({ accountId: "acct-cap-new", walletAddress: VALID_ADDRESS });
    expect(walletStore.size <= STORE_MAX_SIZE).toBeTruthy(); // store size exceeds cap
  });
});

// ---------------------------------------------------------------------------
// Recovery TTL constant sanity check
// ---------------------------------------------------------------------------

describe("RECOVERY_TTL_MS", () => {
  it("is 15 minutes", () => {
    expect(RECOVERY_TTL_MS).toBe(15 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// AUTH-094: Instrumentation — unlink audit trail
// ---------------------------------------------------------------------------

describe("unlink — audit trail (AUTH-094)", () => {
  it("wallet is removed from store after unlink", () => {
    link({ accountId: "audit-unlink-1", walletAddress: VALID_ADDRESS });
    unlink({ accountId: "audit-unlink-1" });
    expect(walletStore.has("audit-unlink-1")).toBe(false);
  });

  it("all recovery tokens for the account are cleaned up on unlink", () => {
    link({ accountId: "audit-unlink-2", walletAddress: VALID_ADDRESS });
    const r1 = initiateRecovery({ accountId: "audit-unlink-2" });
    expect(r1.ok).toBe(true);
    if (!r1.ok) throw new Error("unreachable");
    // Issue a second token (invalidates first, but let's verify cleanup)
    const r2 = initiateRecovery({ accountId: "audit-unlink-2" });
    expect(r2.ok).toBe(true);
    if (!r2.ok) throw new Error("unreachable");

    unlink({ accountId: "audit-unlink-2" });

    expect(recoveryStore.has(r1.recoveryToken)).toBe(false); // first token cleaned up
    expect(recoveryStore.has(r2.recoveryToken)).toBe(false); // second token cleaned up
  });
});

// ---------------------------------------------------------------------------
// AUTH-094: Instrumentation — rotate audit trail
// ---------------------------------------------------------------------------

describe("rotate — audit trail (AUTH-094)", () => {
  it("store reflects new address after rotation", () => {
    link({ accountId: "audit-rotate-1", walletAddress: VALID_ADDRESS });
    rotate({ accountId: "audit-rotate-1", newWalletAddress: VALID_ADDRESS_2 });
    expect(walletStore.get("audit-rotate-1")?.walletAddress).toBe(VALID_ADDRESS_2);
  });

  it("rotatedAt is set on the record after rotation", () => {
    link({ accountId: "audit-rotate-2", walletAddress: VALID_ADDRESS });
    rotate({ accountId: "audit-rotate-2", newWalletAddress: VALID_ADDRESS_2 });
    const record = walletStore.get("audit-rotate-2");
    expect(record?.rotatedAt).toBeTruthy(); // rotatedAt is set on the record
    expect(new Date(record!.rotatedAt!) <= new Date()).toBeTruthy(); // rotatedAt is not in the future
  });

  it("linkedAt is preserved across multiple rotations", () => {
    link({ accountId: "audit-rotate-3", walletAddress: VALID_ADDRESS });
    const originalLinkedAt = walletStore.get("audit-rotate-3")!.linkedAt;
    rotate({ accountId: "audit-rotate-3", newWalletAddress: VALID_ADDRESS_2 });
    rotate({ accountId: "audit-rotate-3", newWalletAddress: VALID_ADDRESS });
    expect(walletStore.get("audit-rotate-3")?.linkedAt).toBe(originalLinkedAt);
  });
});

// ---------------------------------------------------------------------------
// AUTH-094: Instrumentation — recovery confirm audit trail
// ---------------------------------------------------------------------------

describe("confirmRecovery — audit trail (AUTH-094)", () => {
  it("token is removed from recoveryStore after successful confirm", () => {
    const init = initiateRecovery({ accountId: "audit-confirm-1" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({
      accountId: "audit-confirm-1",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });

    expect(recoveryStore.has(init.recoveryToken)).toBe(false); // token consumed after confirm
  });

  it("rotatedAt is set on the record after recovery confirm", () => {
    link({ accountId: "audit-confirm-2", walletAddress: VALID_ADDRESS });
    const init = initiateRecovery({ accountId: "audit-confirm-2" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({
      accountId: "audit-confirm-2",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS_2,
    });

    const record = walletStore.get("audit-confirm-2");
    expect(record?.rotatedAt).toBeTruthy(); // rotatedAt set after recovery confirm
  });

  it("token is NOT consumed when account mismatch occurs (AUTH-094 security)", () => {
    const init = initiateRecovery({ accountId: "audit-confirm-3" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({
      accountId: "audit-confirm-WRONG",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS,
    });

    // Token must still be valid for the correct account
    expect(recoveryStore.has(init.recoveryToken)).toBeTruthy(); // token preserved after wrong-account attempt
  });
});

// ---------------------------------------------------------------------------
// AUTH-097: checkRewardReadiness — happy path
// ---------------------------------------------------------------------------

describe("checkRewardReadiness — ready (AUTH-097)", () => {
  it("returns ready:true when a valid wallet is linked and no recovery in progress", () => {
    link({ accountId: "ready-1", walletAddress: VALID_ADDRESS });
    const result = checkRewardReadiness("ready-1");
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("unreachable");
    expect(result.accountId).toBe("ready-1");
    expect(result.walletAddress).toBe(VALID_ADDRESS);
  });

  it("returns ready:true after a rotation (new address is valid)", () => {
    link({ accountId: "ready-2", walletAddress: VALID_ADDRESS });
    rotate({ accountId: "ready-2", newWalletAddress: VALID_ADDRESS_2 });
    const result = checkRewardReadiness("ready-2");
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("unreachable");
    expect(result.walletAddress).toBe(VALID_ADDRESS_2);
  });

  it("returns ready:true after recovery token expires (no longer in progress)", () => {
    link({ accountId: "ready-3", walletAddress: VALID_ADDRESS });
    // Manually insert an expired recovery token on the record
    walletStore.set("ready-3", {
      accountId: "ready-3",
      walletAddress: VALID_ADDRESS,
      linkedAt: new Date().toISOString(),
      recoveryToken: "some-token",
      recoveryExpiresAt: Date.now() - 1, // already expired
    });
    const result = checkRewardReadiness("ready-3");
    expect(result.ready).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AUTH-097: checkRewardReadiness — not ready
// ---------------------------------------------------------------------------

describe("checkRewardReadiness — not ready (AUTH-097)", () => {
  it("returns NO_WALLET_LINKED when no wallet is associated", () => {
    const result = checkRewardReadiness("no-wallet-acct");
    expect(result.ready).toBe(false);
    if (result.ready) throw new Error("unreachable");
    expect(result.reason).toBe("NO_WALLET_LINKED");
    expect(result.accountId).toBe("no-wallet-acct");
  });

  it("returns NO_WALLET_LINKED after the wallet is unlinked", () => {
    link({ accountId: "unlinked-acct", walletAddress: VALID_ADDRESS });
    unlink({ accountId: "unlinked-acct" });
    const result = checkRewardReadiness("unlinked-acct");
    expect(result.ready).toBe(false);
    if (result.ready) throw new Error("unreachable");
    expect(result.reason).toBe("NO_WALLET_LINKED");
  });

  it("returns INVALID_ADDRESS when the stored address is malformed", () => {
    // Directly inject a bad record (bypasses link validation)
    walletStore.set("bad-addr-acct", {
      accountId: "bad-addr-acct",
      walletAddress: "NOT_A_VALID_STELLAR_ADDRESS",
      linkedAt: new Date().toISOString(),
    });
    const result = checkRewardReadiness("bad-addr-acct");
    expect(result.ready).toBe(false);
    if (result.ready) throw new Error("unreachable");
    expect(result.reason).toBe("INVALID_ADDRESS");
  });

  it("returns RECOVERY_IN_PROGRESS when an active recovery token exists", () => {
    link({ accountId: "recovery-acct", walletAddress: VALID_ADDRESS });
    initiateRecovery({ accountId: "recovery-acct" });
    const result = checkRewardReadiness("recovery-acct");
    expect(result.ready).toBe(false);
    if (result.ready) throw new Error("unreachable");
    expect(result.reason).toBe("RECOVERY_IN_PROGRESS");
  });

  it("returns ready:true once recovery is confirmed (token consumed)", () => {
    link({ accountId: "post-recovery-acct", walletAddress: VALID_ADDRESS });
    const init = initiateRecovery({ accountId: "post-recovery-acct" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    // Not ready while recovery is in progress
    const during = checkRewardReadiness("post-recovery-acct");
    expect(during.ready).toBe(false);

    confirmRecovery({
      accountId: "post-recovery-acct",
      recoveryToken: init.recoveryToken,
      newWalletAddress: VALID_ADDRESS_2,
    });

    // Ready again after recovery is confirmed
    const after = checkRewardReadiness("post-recovery-acct");
    expect(after.ready).toBe(true);
    if (!after.ready) throw new Error("unreachable");
    expect(after.walletAddress).toBe(VALID_ADDRESS_2);
  });
});

// ---------------------------------------------------------------------------
// AUTH-097: checkRewardReadiness — edge cases
// ---------------------------------------------------------------------------

describe("checkRewardReadiness — edge cases (AUTH-097)", () => {
  it("trims whitespace from accountId", () => {
    link({ accountId: "trim-acct", walletAddress: VALID_ADDRESS });
    const result = checkRewardReadiness("  trim-acct  ");
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("unreachable");
    expect(result.accountId).toBe("trim-acct");
  });

  it("is idempotent — multiple calls return the same result", () => {
    link({ accountId: "idem-acct", walletAddress: VALID_ADDRESS });
    const r1 = checkRewardReadiness("idem-acct");
    const r2 = checkRewardReadiness("idem-acct");
    expect(r1.ready).toBe(r2.ready);
    if (r1.ready && r2.ready) {
      expect(r1.walletAddress).toBe(r2.walletAddress);
    }
  });
});
