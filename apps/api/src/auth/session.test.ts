/**
 * AUTH-012 / AUTH-015 — Session refresh and logout tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/auth/session.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { refresh, logout, refreshInFlight, STORE_MAX_SIZE } from "./session.js";
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
  refreshInFlight.clear();
  seedAccount(SEED);
});

// ---------------------------------------------------------------------------
// Refresh — happy path
// ---------------------------------------------------------------------------

describe("refresh — happy path", () => {
  it("returns ok:true with new tokens for a valid refresh token", () => {
    seedRefreshToken("a".repeat(36), SEED.id);
    const result = refresh({ refreshToken: "a".repeat(36) });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.ok(result.tokens.accessToken.split(".").length === 3, "access token is JWT-shaped");
    assert.ok(result.tokens.refreshToken.length > 0, "new refresh token present");
    assert.ok(new Date(result.tokens.expiresAt) > new Date(), "expiresAt is in the future");
  });

  it("rotates the refresh token (old token is invalidated)", () => {
    const token = "b".repeat(36);
    seedRefreshToken(token, SEED.id);
    const result = refresh({ refreshToken: token });
    assert.equal(result.ok, true);
    assert.equal(refreshStore.has(token), false);
  });

  it("new refresh token is stored in refreshStore", () => {
    const token = "c".repeat(36);
    seedRefreshToken(token, SEED.id);
    const result = refresh({ refreshToken: token });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.ok(refreshStore.has(result.tokens.refreshToken), "new token in store");
  });

  it("replayed rotated token returns INVALID_REFRESH_TOKEN", () => {
    const token = "d".repeat(36);
    seedRefreshToken(token, SEED.id);
    const first = refresh({ refreshToken: token });
    assert.equal(first.ok, true);
    const second = refresh({ refreshToken: token });
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
    const result = refresh({ refreshToken: "e".repeat(36) });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_REFRESH_TOKEN");
  });

  it("returns INVALID_REFRESH_TOKEN for expired token", () => {
    const token = "f".repeat(36);
    seedRefreshToken(token, SEED.id, -1);
    const result = refresh({ refreshToken: token });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_REFRESH_TOKEN");
    assert.equal(refreshStore.has(token), false);
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
// AUTH-013: Token-length guard
// ---------------------------------------------------------------------------

describe("refresh — token-length guard (AUTH-013)", () => {
  it("rejects a token shorter than 36 chars with VALIDATION_ERROR", () => {
    const result = refresh({ refreshToken: "short" });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("rejects a token longer than 36 chars with VALIDATION_ERROR", () => {
    const result = refresh({ refreshToken: "x".repeat(37) });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("accepts a token of exactly 36 chars (UUID length)", () => {
    const token = "g".repeat(36);
    seedRefreshToken(token, SEED.id);
    const result = refresh({ refreshToken: token });
    // Token exists in store so it should succeed
    assert.equal(result.ok, true);
  });
});

// ---------------------------------------------------------------------------
// AUTH-013: Concurrent-refresh lock
// ---------------------------------------------------------------------------

describe("refresh — concurrent-refresh lock (AUTH-013)", () => {
  it("returns INVALID_REFRESH_TOKEN when the same token is already in-flight", () => {
    const token = "h".repeat(36);
    seedRefreshToken(token, SEED.id);
    // Simulate an in-flight refresh by pre-populating the lock
    refreshInFlight.add(token);
    const result = refresh({ refreshToken: token });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "INVALID_REFRESH_TOKEN");
    // Clean up
    refreshInFlight.delete(token);
  });

  it("lock is released after a successful refresh", () => {
    const token = "i".repeat(36);
    seedRefreshToken(token, SEED.id);
    refresh({ refreshToken: token });
    assert.equal(refreshInFlight.has(token), false, "lock released after success");
  });

  it("lock is released after a failed refresh (expired token)", () => {
    const token = "j".repeat(36);
    seedRefreshToken(token, SEED.id, -1);
    refresh({ refreshToken: token });
    assert.equal(refreshInFlight.has(token), false, "lock released after failure");
  });
});

// ---------------------------------------------------------------------------
// AUTH-013: Store-size cap
// ---------------------------------------------------------------------------

describe("refresh — store-size cap (AUTH-013)", () => {
  it("evicts the oldest entry when store reaches STORE_MAX_SIZE", () => {
    // Fill the store to capacity with synthetic tokens
    const firstToken = "k".repeat(36);
    refreshStore.set(firstToken, { accountId: "acct-0", expiresAt: Date.now() + 1_000_000 });
    for (let i = 1; i < STORE_MAX_SIZE; i++) {
      refreshStore.set(`tok-${i}-${"0".repeat(30 - String(i).length)}`, {
        accountId: `acct-${i}`,
        expiresAt: Date.now() + 1_000_000,
      });
    }
    assert.equal(refreshStore.size, STORE_MAX_SIZE);

    // Trigger issueTokens via a successful refresh — needs a valid seeded token
    // We'll add one more directly to trigger the cap logic
    const triggerToken = "l".repeat(36);
    seedRefreshToken(triggerToken, SEED.id);
    // Store is now STORE_MAX_SIZE + 1; refresh will evict oldest when issuing new token
    const result = refresh({ refreshToken: triggerToken });
    assert.equal(result.ok, true);
    // Store should not exceed STORE_MAX_SIZE (old token deleted + new token added, oldest evicted)
    assert.ok(refreshStore.size <= STORE_MAX_SIZE, `store size ${refreshStore.size} exceeds cap`);
    // The very first token we inserted should have been evicted
    assert.equal(refreshStore.has(firstToken), false, "oldest entry evicted");
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

describe("logout — happy path", () => {
  it("revokes a valid refresh token", () => {
    const token = "m".repeat(36);
    seedRefreshToken(token, SEED.id);
    const result = logout({ refreshToken: token });
    assert.equal(result.ok, true);
    assert.equal(refreshStore.has(token), false);
  });

  it("is idempotent — revoking an unknown token returns ok:true", () => {
    const result = logout({ refreshToken: "n".repeat(36) });
    assert.equal(result.ok, true);
  });

  it("is idempotent — double logout returns ok:true both times", () => {
    const token = "o".repeat(36);
    seedRefreshToken(token, SEED.id);
    const first = logout({ refreshToken: token });
    const second = logout({ refreshToken: token });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
  });

  it("after logout, refresh with the same token returns INVALID_REFRESH_TOKEN", () => {
    const token = "p".repeat(36);
    seedRefreshToken(token, SEED.id);
    logout({ refreshToken: token });
    const result = refresh({ refreshToken: token });
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
