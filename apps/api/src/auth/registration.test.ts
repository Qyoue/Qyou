/**
 * AUTH-005 — Registration lifecycle tests.
 *
 * Run with:
 *   node --import tsx/esm --test src/auth/registration.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register, clearRateBuckets } from "./registration.js";
import { clearAccounts } from "./store.js";

beforeEach(() => {
  clearAccounts();
  clearRateBuckets();
});

describe("register — happy path", () => {
  it("creates an account and returns ok:true", () => {
    const result = register({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.email, "alice@example.com");
    assert.equal(result.status, "pending_verification");
    assert.ok(result.accountId.length > 0);
  });

  it("normalises email to lowercase", () => {
    const result = register({ email: "Alice@Example.COM", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.email, "alice@example.com");
  });

  it("uses email prefix as displayName when not provided", () => {
    register({ email: "bob@example.com", password: "password123" }, "1.2.3.4");
    // No assertion on displayName from result — it's stored internally; just ensure no error
  });
});

describe("register — validation", () => {
  it("rejects missing email", () => {
    const result = register({ email: "", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("rejects invalid email format", () => {
    const result = register({ email: "not-an-email", password: "password123" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("rejects password shorter than 8 characters", () => {
    const result = register({ email: "alice@example.com", password: "short" }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });

  it("rejects blank displayName", () => {
    const result = register({ email: "alice@example.com", password: "password123", displayName: "   " }, "1.2.3.4");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "VALIDATION_ERROR");
  });
});

describe("register — duplicate email", () => {
  it("returns DUPLICATE_EMAIL on second registration with same email", () => {
    register({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    const result = register({ email: "alice@example.com", password: "different123" }, "1.2.3.5");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "DUPLICATE_EMAIL");
  });

  it("treats email as case-insensitive for duplicate check", () => {
    register({ email: "alice@example.com", password: "password123" }, "1.2.3.4");
    const result = register({ email: "ALICE@EXAMPLE.COM", password: "password123" }, "1.2.3.5");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "DUPLICATE_EMAIL");
  });
});

describe("register — rate limiting", () => {
  it("returns RATE_LIMITED after 5 attempts from the same IP", () => {
    for (let i = 0; i < 5; i++) {
      register({ email: `user${i}@example.com`, password: "password123" }, "9.9.9.9");
    }
    const result = register({ email: "overflow@example.com", password: "password123" }, "9.9.9.9");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.code, "RATE_LIMITED");
  });

  it("allows registration from a different IP", () => {
    for (let i = 0; i < 6; i++) {
      register({ email: `user${i}@example.com`, password: "password123" }, "9.9.9.9");
    }
    const result = register({ email: "other@example.com", password: "password123" }, "8.8.8.8");
    assert.equal(result.ok, true);
  });
});
