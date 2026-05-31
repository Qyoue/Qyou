/**
 * AUTH-007/008/009/010 — Login lifecycle, hardening, and instrumentation tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/auth/login.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { login, clearLoginRateBuckets, refreshStore } from "./login.js";
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
  refreshStore.clear();
  seedAccount(SEED);
});

// ---------------------------------------------------------------------------
// Happy path (AUTH-007)
// ---------------------------------------------------------------------------

describe("login — happy path", () => {
  it("returns ok:true with tokens for valid credentials", () => {
    const result = login({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.email, "alice@example.com");
    assert.equal(result.accountId, SEED.id);
    assert.ok(result.tokens.accessToken.split(".").length === 3, "access token is JWT-shaped");
    assert.ok(result.tokens.refreshToken.length > 0, "refresh token present");
    assert.ok(new Date(result.tokens.expiresAt) > new Date(), "expiresAt is in the future");
  });

  it("is case-insensitive for email", () => {
    const result = login({ email: "ALICE@EXAMPLE.COM", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
  });

  it("stores refresh token in refreshStore", () => {
    const result = login({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.ok(refreshStore.has(result.tokens.refreshToken), "refresh token stored");
    const entry = refreshStore.get(result.tokens.refreshToken)!;
    assert.equal(entry.accountId, SEED.id);
    assert.ok(entry.expiresAt > Date.now(), "refresh token not yet expired");
  });

  it("access token payload contains sub and email", () => {
    const result = login({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    const [, bodyB64] = result.tokens.accessToken.split(".");
    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString());
    assert.equal(payload.sub, SEED.id);
    assert.equal(payload.email, SEED.email);
    assert.ok(typeof payload.exp === "number", "exp claim present");
    assert.ok(typeof payload.iat === "number", "iat claim present");
  });

  it("each login issues a distinct refresh token", () => {
    const r1 = login({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    const r2 = login({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    if (!r1.ok || !r2.ok) throw new Error("unreachable");
    assert.notEqual(r1.tokens.refreshToken, r2.tokens.refreshToken);
  });
});

// ---------------------------------------------------------------------------
// Invalid credentials (AUTH-008)
// ---------------------------------------------------------------------------

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

  it("does not reveal whether email exists (same error code and message)", () => {
    const knownResult = login({ email: "alice@example.com", password: "wrong" }, "1.2.3.4");
    const unknownResult = login({ email: "ghost@example.com", password: "wrong" }, "1.2.3.5");
    assert.equal(knownResult.ok, false);
    assert.equal(unknownResult.ok, false);
    if (knownResult.ok || unknownResult.ok) throw new Error("unreachable");
    assert.equal(knownResult.code, unknownResult.code);
    assert.equal(knownResult.message, unknownResult.message);
  });

  it("does not store a refresh token on failed login", () => {
    login({ email: "alice@example.com", password: "wrong" }, "1.2.3.4");
    assert.equal(refreshStore.size, 0);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

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

  it("rejects missing email", () => {
    const result = login({ email: "", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Rate limiting (AUTH-008)
// ---------------------------------------------------------------------------

describe("login — rate limiting", () => {
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

  it("rate limit is per-IP, not per-account", () => {
    // Exhaust rate limit on one IP
    for (let i = 0; i < 6; i++) {
      login({ email: "alice@example.com", password: "wrong" }, "9.9.9.9");
    }
    // Different IP can still log in
    const result = login({ email: "alice@example.com", password: "password123" }, "10.0.0.1");
    assert.equal(result.ok, true);
  });
});
