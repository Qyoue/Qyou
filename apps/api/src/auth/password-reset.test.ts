/**
 * AUTH-016 — Password reset smoke tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/auth/password-reset.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { requestReset, confirmReset, resetStore, clearResetRateBuckets } from "./password-reset.js";
import { refreshStore } from "./login.js";
import { clearAccounts, seedAccount } from "./store.js";
import { hashPassword } from "./registration.js";
import { login, clearLoginRateBuckets } from "./login.js";

const SEED = {
  id: "test-uuid-reset",
  email: "alice@example.com",
  passwordHash: hashPassword("oldpassword1"),
  displayName: "alice",
  createdAt: new Date().toISOString(),
  status: "active" as const,
};

beforeEach(() => {
  clearAccounts();
  clearLoginRateBuckets();
  clearResetRateBuckets();
  refreshStore.clear();
  resetStore.clear();
  // Spread to prevent mutation bleed between tests (confirmReset mutates passwordHash)
  seedAccount({ ...SEED });
});

describe("requestReset", () => {
  it("returns ok:true for a known email", () => {
    const result = requestReset({ email: "alice@example.com" }, "1.2.3.4");
    assert.equal(result.ok, true);
  });

  it("returns ok:true for an unknown email (no enumeration)", () => {
    const result = requestReset({ email: "nobody@example.com" }, "1.2.3.4");
    assert.equal(result.ok, true);
  });

  it("returns VALIDATION_ERROR for invalid email", () => {
    const result = requestReset({ email: "not-an-email" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("stores a reset token for a known account", () => {
    requestReset({ email: "alice@example.com" }, "1.2.3.4");
    assert.equal(resetStore.size, 1);
  });
});

describe("confirmReset", () => {
  it("returns VALIDATION_ERROR for missing token", () => {
    const result = confirmReset({ token: "", newPassword: "newpassword1" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for short newPassword", () => {
    const result = confirmReset({ token: "a".repeat(36), newPassword: "short" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns INVALID_RESET_TOKEN for unknown token", () => {
    const result = confirmReset({ token: "b".repeat(36), newPassword: "newpassword1" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_RESET_TOKEN");
  });

  it("returns INVALID_RESET_TOKEN for expired token", () => {
    resetStore.set("c".repeat(36), { accountId: SEED.id, expiresAt: Date.now() - 1 });
    const result = confirmReset({ token: "c".repeat(36), newPassword: "newpassword1" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_RESET_TOKEN");
  });

  it("succeeds with a valid token and updates the password", () => {
    requestReset({ email: "alice@example.com" }, "1.2.3.4");
    const token = [...resetStore.keys()][0]!;
    const result = confirmReset({ token, newPassword: "newpassword1" });
    assert.equal(result.ok, true);
    // Token consumed
    assert.equal(resetStore.has(token), false);
    // Can now login with new password
    const loginResult = login({ email: "alice@example.com", password: "newpassword1" }, "1.2.3.4");
    assert.equal(loginResult.ok, true);
  });

  it("revokes all refresh tokens for the account on confirm", () => {
    const loginResult = login({ email: "alice@example.com", password: "oldpassword1" }, "1.2.3.4");
    assert.equal(loginResult.ok, true);
    if (!loginResult.ok) throw new Error("unreachable");
    assert.equal(refreshStore.size, 1);

    requestReset({ email: "alice@example.com" }, "1.2.3.4");
    const token = [...resetStore.keys()][0]!;
    confirmReset({ token, newPassword: "newpassword1" });

    assert.equal(refreshStore.size, 0, "all refresh tokens revoked");
  });

  it("is single-use — replaying the token returns INVALID_RESET_TOKEN", () => {
    requestReset({ email: "alice@example.com" }, "1.2.3.4");
    const token = [...resetStore.keys()][0]!;
    confirmReset({ token, newPassword: "newpassword1" });
    const second = confirmReset({ token, newPassword: "anotherpassword" });
    assert.equal(second.ok, false);
    if (second.ok) throw new Error("unreachable");
    assert.equal(second.code, "INVALID_RESET_TOKEN");
  });
});
