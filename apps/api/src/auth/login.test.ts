/**
 * AUTH-007/008 — Login lifecycle and hardening tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/auth/login.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { login, clearLoginRateBuckets } from "./login.js";
import { clearAccounts, seedAccount } from "./store.js";
import { hashPassword } from "./registration.js";

const SEED = {
  id: "test-uuid-1",
  email: "alice@example.com",
  passwordHash: hashPassword("password123"),
  displayName: "alice",
  createdAt: new Date().toISOString(),
  status: "active" as const,
};

beforeEach(() => {
  clearAccounts();
  clearLoginRateBuckets();
  seedAccount(SEED);
});

describe("login — happy path", () => {
  it("returns ok:true with tokens for valid credentials", () => {
    const result = login({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.email, "alice@example.com");
    assert.ok(result.tokens.accessToken.split(".").length === 3);
    assert.ok(result.tokens.refreshToken.length > 0);
    assert.ok(new Date(result.tokens.expiresAt) > new Date());
  });

  it("is case-insensitive for email", () => {
    const result = login({ email: "ALICE@EXAMPLE.COM", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
  });
});

describe("login — invalid credentials", () => {
  it("returns INVALID_CREDENTIALS for wrong password", () => {
    const result = login({ email: "alice@example.com", password: "wrongpassword" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_CREDENTIALS");
  });

  it("returns INVALID_CREDENTIALS for unknown email", () => {
    const result = login({ email: "nobody@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_CREDENTIALS");
  });

  it("does not reveal whether email exists (same error code)", () => {
    const knownResult = login({ email: "alice@example.com", password: "wrong" }, "1.2.3.4");
    const unknownResult = login({ email: "ghost@example.com", password: "wrong" }, "1.2.3.5");
    assert.equal(knownResult.ok, false);
    assert.equal(unknownResult.ok, false);
    if (knownResult.ok || unknownResult.ok) throw new Error("unreachable");
    assert.equal(knownResult.code, unknownResult.code);
    assert.equal(knownResult.message, unknownResult.message);
  });
});

describe("login — validation", () => {
  it("rejects invalid email format", () => {
    const result = login({ email: "not-an-email", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("rejects empty password", () => {
    const result = login({ email: "alice@example.com", password: "" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });
});

describe("login — rate limiting (AUTH-008)", () => {
  it("returns RATE_LIMITED after 5 failed attempts from same IP", () => {
    for (let i = 0; i < 5; i++) {
      login({ email: "alice@example.com", password: "wrong" }, "9.9.9.9");
    }
    const result = login({ email: "alice@example.com", password: "password123" }, "9.9.9.9");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "RATE_LIMITED");
  });

  it("allows login from a different IP", () => {
    for (let i = 0; i < 6; i++) {
      login({ email: "alice@example.com", password: "wrong" }, "9.9.9.9");
    }
    const result = login({ email: "alice@example.com", password: "password123" }, "8.8.8.8");
    assert.equal(result.ok, true);
  });
});
