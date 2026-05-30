/**
 * AUTH-021 through AUTH-024 — Email verification lifecycle tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/auth/verification.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { verify, issueVerificationToken, verificationStore, clearVerifyRateBuckets } from "./verification.js";
import { clearAccounts, seedAccount } from "./store.js";

const IP = "1.2.3.4";

function makeAccount(overrides: Partial<{ id: string; email: string; status: "pending_verification" | "active" }> = {}) {
  return {
    id: overrides.id ?? "acc-1",
    email: overrides.email ?? "alice@example.com",
    passwordHash: "hash",
    displayName: "Alice",
    createdAt: new Date().toISOString(),
    status: overrides.status ?? "pending_verification" as const,
  };
}

beforeEach(() => {
  clearAccounts();
  verificationStore.clear();
  clearVerifyRateBuckets();
});

describe("verify — happy path", () => {
  it("activates a pending account and returns ok:true", () => {
    const account = makeAccount();
    seedAccount(account);
    const token = issueVerificationToken(account.id);

    const result = verify({ token }, IP);
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.accountId, account.id);
    assert.equal(result.email, account.email);
    assert.equal(account.status, "active");
  });

  it("consumes the token (single-use)", () => {
    const account = makeAccount();
    seedAccount(account);
    const token = issueVerificationToken(account.id);

    verify({ token }, IP);
    const second = verify({ token }, IP);
    assert.equal(second.ok, false);
    if (second.ok) throw new Error("unreachable");
    assert.equal(second.code, "INVALID_VERIFICATION_TOKEN");
  });
});

describe("verify — validation", () => {
  it("rejects empty token", () => {
    const result = verify({ token: "" }, IP);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("rejects token with wrong length", () => {
    const result = verify({ token: "short" }, IP);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });
});

describe("verify — invalid / expired token", () => {
  it("returns INVALID_VERIFICATION_TOKEN for unknown token", () => {
    const fakeToken = "00000000-0000-0000-0000-000000000000";
    const result = verify({ token: fakeToken }, IP);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_VERIFICATION_TOKEN");
  });

  it("returns INVALID_VERIFICATION_TOKEN for expired token", () => {
    const account = makeAccount();
    seedAccount(account);
    const token = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    verificationStore.set(token, { accountId: account.id, expiresAt: Date.now() - 1 });

    const result = verify({ token }, IP);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_VERIFICATION_TOKEN");
  });
});

describe("verify — already verified", () => {
  it("returns ALREADY_VERIFIED for an active account", () => {
    const account = makeAccount({ status: "active" });
    seedAccount(account);
    const token = issueVerificationToken(account.id);

    const result = verify({ token }, "2.2.2.2");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "ALREADY_VERIFIED");
  });
});

describe("verify — rate limiting", () => {
  it("returns RATE_LIMITED after 5 attempts from the same IP", () => {
    for (let i = 0; i < 5; i++) {
      verify({ token: `0000000${i}-0000-0000-0000-000000000000` }, "9.9.9.9");
    }
    const result = verify({ token: "00000099-0000-0000-0000-000000000000" }, "9.9.9.9");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "RATE_LIMITED");
  });

  it("allows attempts from a different IP", () => {
    for (let i = 0; i < 6; i++) {
      verify({ token: `0000000${i}-0000-0000-0000-000000000000` }, "9.9.9.9");
    }
    const account = makeAccount();
    seedAccount(account);
    const token = issueVerificationToken(account.id);
    const result = verify({ token }, "8.8.8.8");
    assert.equal(result.ok, true);
  });
});

describe("issueVerificationToken", () => {
  it("returns a UUID-shaped token and stores it", () => {
    const token = issueVerificationToken("acc-1");
    assert.equal(token.length, 36);
    assert.ok(verificationStore.has(token));
  });
});
