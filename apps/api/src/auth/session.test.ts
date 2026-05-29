/**
 * AUTH-012 — Session refresh and logout tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/auth/session.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { refresh, logout } from "./session.js";
import { refreshStore } from "./login.js";
import { clearAccounts, seedAccount } from "./store.js";
import { hashPassword } from "./registration.js";
import { login, clearLoginRateBuckets } from "./login.js";

const SEED = {
  id: "test-uuid-session",
  email: "bob@example.com",
  passwordHash: hashPassword("password123"),
  displayName: "bob",
  createdAt: new Date().toISOString(),
  status: "active" as const,
};

/** Seed a valid refresh token directly into the store. */
function seedRefreshToken(token: string, accountId: string, ttlMs = 7 * 24 * 60 * 60 * 1000): void {
  refreshStore.set(token, { accountId, expiresAt: Date.now() + ttlMs });
}

beforeEach(() => {
  clearAccounts();
  clearLoginRateBuckets();
  refreshStore.clear();
  seedAccount(SEED);
});

// ---------------------------------------------------------------------------
// Refresh — happy path
// ---------------------------------------------------------------------------

describe("refresh — happy path", () => {
  it("returns ok:true with new tokens for a valid refresh token", () => {
    seedRefreshToken("valid-token-1", SEED.id);
    const result = refresh({ refreshToken: "valid-token-1" });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.ok(result.tokens.accessToken.split(".").length === 3, "access token is JWT-shaped");
    assert.ok(result.tokens.refreshToken.length > 0, "new refresh token present");
    assert.ok(new Date(result.tokens.expiresAt) > new Date(), "expiresAt is in the future");
  });

  it("rotates the refresh token (old token is invalidated)", () => {
    seedRefreshToken("rotate-me", SEED.id);
    const result = refresh({ refreshToken: "rotate-me" });
    assert.equal(result.ok, true);
    // Old token must be gone
    assert.equal(refreshStore.has("rotate-me"), false);
  });

  it("new refresh token is stored in refreshStore", () => {
    seedRefreshToken("token-a", SEED.id);
    const result = refresh({ refreshToken: "token-a" });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.ok(refreshStore.has(result.tokens.refreshToken), "new token in store");
  });

  it("replayed rotated token returns INVALID_REFRESH_TOKEN", () => {
    seedRefreshToken("one-time-token", SEED.id);
    const first = refresh({ refreshToken: "one-time-token" });
    assert.equal(first.ok, true);
    // Replay the original token
    const second = refresh({ refreshToken: "one-time-token" });
    assert.equal(second.ok, false);
    if (second.ok) throw new Error("unreachable");
    assert.equal(second.code, "INVALID_REFRESH_TOKEN");
  });

  it("works end-to-end via login then refresh", () => {
    const loginResult = login({ email: "bob@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(loginResult.ok, true);
    if (!loginResult.ok) throw new Error("unreachable");
    const refreshResult = refresh({ refreshToken: loginResult.tokens.refreshToken });
    assert.equal(refreshResult.ok, true);
    if (!refreshResult.ok) throw new Error("unreachable");
    assert.notEqual(refreshResult.tokens.refreshToken, loginResult.tokens.refreshToken);
  });
});

// ---------------------------------------------------------------------------
// Refresh — invalid / expired tokens
// ---------------------------------------------------------------------------

describe("refresh — invalid tokens", () => {
  it("returns INVALID_REFRESH_TOKEN for unknown token", () => {
    const result = refresh({ refreshToken: "does-not-exist" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_REFRESH_TOKEN");
  });

  it("returns INVALID_REFRESH_TOKEN for expired token", () => {
    // Seed a token that expired 1 ms ago
    seedRefreshToken("expired-token", SEED.id, -1);
    const result = refresh({ refreshToken: "expired-token" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_REFRESH_TOKEN");
    // Expired token should be cleaned up
    assert.equal(refreshStore.has("expired-token"), false);
  });

  it("returns VALIDATION_ERROR for empty refreshToken", () => {
    const result = refresh({ refreshToken: "" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR for whitespace-only refreshToken", () => {
    const result = refresh({ refreshToken: "   " });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

describe("logout — happy path", () => {
  it("revokes a valid refresh token", () => {
    seedRefreshToken("logout-token", SEED.id);
    const result = logout({ refreshToken: "logout-token" });
    assert.equal(result.ok, true);
    assert.equal(refreshStore.has("logout-token"), false);
  });

  it("is idempotent — revoking an unknown token returns ok:true", () => {
    const result = logout({ refreshToken: "already-gone" });
    assert.equal(result.ok, true);
  });

  it("is idempotent — double logout returns ok:true both times", () => {
    seedRefreshToken("double-logout", SEED.id);
    const first = logout({ refreshToken: "double-logout" });
    const second = logout({ refreshToken: "double-logout" });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
  });

  it("after logout, refresh with the same token returns INVALID_REFRESH_TOKEN", () => {
    seedRefreshToken("post-logout-token", SEED.id);
    logout({ refreshToken: "post-logout-token" });
    const result = refresh({ refreshToken: "post-logout-token" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_REFRESH_TOKEN");
  });
});

describe("logout — validation", () => {
  it("returns VALIDATION_ERROR for empty refreshToken", () => {
    const result = logout({ refreshToken: "" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });
});
