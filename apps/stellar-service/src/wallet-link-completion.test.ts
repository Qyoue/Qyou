/**
 * AUTH-089: Wallet-link completion and account binding flow tests.
 *
 * Covers the full completion lifecycle:
 * - link → verify readiness → rotate → confirm recovery → final readiness
 * - Partial binding prevention (link fails if already linked)
 * - Audit trail checkpoints at each stage
 * - Payout-ambiguity prevention (readiness blocked during recovery)
 *
 * Run with: npm test --workspace @qyou/stellar-service
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
  clearRateBuckets,
} from "./wallet-link.js";

const ADDR_A = "GBVVJJWAKWYMKWMQHWOMTEKOVUA36TYVWRECQ7YGPMXWYE5VWHUWMXNB";
const ADDR_B = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function reset() {
  walletStore.clear();
  recoveryStore.clear();
  clearRateBuckets();
}

beforeEach(reset);

// ---------------------------------------------------------------------------
// Full completion flow
// ---------------------------------------------------------------------------

describe("wallet-link completion flow (AUTH-089)", () => {
  it("link → readiness check → ready for payouts", () => {
    const linkResult = link({ accountId: "flow-1", walletAddress: ADDR_A });
    expect(linkResult.ok).toBe(true);

    const readiness = checkRewardReadiness("flow-1");
    expect(readiness.ready).toBe(true);
    if (readiness.ready) expect(readiness.walletAddress).toBe(ADDR_A);
  });

  it("link → rotate → readiness reflects new address", () => {
    link({ accountId: "flow-2", walletAddress: ADDR_A });
    const rotateResult = rotate({ accountId: "flow-2", newWalletAddress: ADDR_B });
    expect(rotateResult.ok).toBe(true);

    const readiness = checkRewardReadiness("flow-2");
    expect(readiness.ready).toBe(true);
    if (readiness.ready) expect(readiness.walletAddress).toBe(ADDR_B);
  });

  it("link → initiate recovery → readiness blocked → confirm → ready again", () => {
    link({ accountId: "flow-3", walletAddress: ADDR_A });

    const init = initiateRecovery({ accountId: "flow-3" });
    expect(init.ok).toBe(true);

    // Blocked during recovery — prevents payout ambiguity
    const during = checkRewardReadiness("flow-3");
    expect(during.ready).toBe(false);
    if (!during.ready) expect(during.reason).toBe("RECOVERY_IN_PROGRESS");

    if (!init.ok) throw new Error("unreachable");
    const confirm = confirmRecovery({
      accountId: "flow-3",
      recoveryToken: init.recoveryToken,
      newWalletAddress: ADDR_B,
    });
    expect(confirm.ok).toBe(true);

    // Ready again after completion
    const after = checkRewardReadiness("flow-3");
    expect(after.ready).toBe(true);
    if (after.ready) expect(after.walletAddress).toBe(ADDR_B);
  });

  it("link → unlink → readiness returns NO_WALLET_LINKED", () => {
    link({ accountId: "flow-4", walletAddress: ADDR_A });
    unlink({ accountId: "flow-4" });

    const readiness = checkRewardReadiness("flow-4");
    expect(readiness.ready).toBe(false);
    if (!readiness.ready) expect(readiness.reason).toBe("NO_WALLET_LINKED");
  });
});

// ---------------------------------------------------------------------------
// Partial binding prevention
// ---------------------------------------------------------------------------

describe("partial binding prevention (AUTH-089)", () => {
  it("second link attempt returns ALREADY_LINKED — no partial overwrite", () => {
    link({ accountId: "partial-1", walletAddress: ADDR_A });
    const second = link({ accountId: "partial-1", walletAddress: ADDR_B });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("ALREADY_LINKED");

    // Original binding is intact
    expect(walletStore.get("partial-1")?.walletAddress).toBe(ADDR_A);
  });

  it("recovery token is single-use — second confirm fails", () => {
    link({ accountId: "partial-2", walletAddress: ADDR_A });
    const init = initiateRecovery({ accountId: "partial-2" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({ accountId: "partial-2", recoveryToken: init.recoveryToken, newWalletAddress: ADDR_B });

    const second = confirmRecovery({
      accountId: "partial-2",
      recoveryToken: init.recoveryToken,
      newWalletAddress: ADDR_A,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("INVALID_RECOVERY_TOKEN");
  });

  it("recovery token for account A cannot be used by account B", () => {
    const init = initiateRecovery({ accountId: "partial-3a" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    const result = confirmRecovery({
      accountId: "partial-3b",
      recoveryToken: init.recoveryToken,
      newWalletAddress: ADDR_A,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_RECOVERY_TOKEN");
  });
});

// ---------------------------------------------------------------------------
// Audit trail checkpoints
// ---------------------------------------------------------------------------

describe("completion flow audit trail (AUTH-089)", () => {
  it("linkedAt is set on initial link", () => {
    link({ accountId: "audit-1", walletAddress: ADDR_A });
    const record = walletStore.get("audit-1");
    expect(record?.linkedAt).toBeTruthy();
    expect(new Date(record!.linkedAt) <= new Date()).toBe(true);
  });

  it("rotatedAt is set after rotation and linkedAt is preserved", () => {
    link({ accountId: "audit-2", walletAddress: ADDR_A });
    const originalLinkedAt = walletStore.get("audit-2")!.linkedAt;

    rotate({ accountId: "audit-2", newWalletAddress: ADDR_B });
    const record = walletStore.get("audit-2");

    expect(record?.rotatedAt).toBeTruthy();
    expect(record?.linkedAt).toBe(originalLinkedAt);
  });

  it("rotatedAt is set after recovery confirm", () => {
    link({ accountId: "audit-3", walletAddress: ADDR_A });
    const init = initiateRecovery({ accountId: "audit-3" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({ accountId: "audit-3", recoveryToken: init.recoveryToken, newWalletAddress: ADDR_B });
    expect(walletStore.get("audit-3")?.rotatedAt).toBeTruthy();
  });

  it("recovery token is removed from store after successful confirm", () => {
    const init = initiateRecovery({ accountId: "audit-4" });
    expect(init.ok).toBe(true);
    if (!init.ok) throw new Error("unreachable");

    confirmRecovery({ accountId: "audit-4", recoveryToken: init.recoveryToken, newWalletAddress: ADDR_A });
    expect(recoveryStore.has(init.recoveryToken)).toBe(false);
  });
});
