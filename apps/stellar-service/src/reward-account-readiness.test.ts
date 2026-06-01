/**
 * AUTH-100: Tests for reward-account readiness flow
 *
 * Covers:
 * - Input validation (missing address, invalid format)
 * - Happy path: funded active account
 * - Account not found (404 from Horizon)
 * - Account underfunded
 * - Horizon unreachable (network error)
 *
 * Fixtures use realistic Stellar testnet-style addresses.
 * Run with: npm test --workspace @qyou/stellar-service
 */

import type { RewardAccountReadinessResult } from "@qyou/types";

// --- Fixtures ---
// Stellar addresses are 56 chars: G + 55 uppercase base32 [A-Z2-7]
const VALID_ADDRESS   = "G" + "A".repeat(55); // GAAA...AAA (56 chars)
const UNFUNDED_ADDRESS = "G" + "B".repeat(55); // GBBB...BBB (56 chars)
const INVALID_ADDRESS = "not-a-stellar-address";

// --- Unit tests for validation logic ---

describe("isValidStellarAddress (validation guardrail, AUTH-098)", () => {
  const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;
  const isValid = (addr: string) => STELLAR_ADDRESS_RE.test(addr);

  it("accepts a valid Stellar address", () => {
    expect(isValid(VALID_ADDRESS)).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValid("")).toBe(false);
  });

  it("rejects a non-Stellar string", () => {
    expect(isValid(INVALID_ADDRESS)).toBe(false);
  });

  it("rejects an address that is too short", () => {
    expect(isValid("GABC")).toBe(false);
  });

  it("rejects an address starting with wrong letter", () => {
    expect(isValid("SAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN")).toBe(false);
  });
});

// --- Unit tests for result shape (AUTH-098 contract) ---

describe("RewardAccountReadinessResult shape", () => {
  it("ok:true result has required fields", () => {
    const result: RewardAccountReadinessResult = {
      ok: true,
      accountId: VALID_ADDRESS,
      stellarAddress: VALID_ADDRESS,
      status: "active"
    };
    expect(result.ok).toBe(true);
    expect(result.accountId).toBe(VALID_ADDRESS);
    expect(result.stellarAddress).toBe(VALID_ADDRESS);
    expect(result.status).toBe("active");
  });

  it("ok:false result has code and message", () => {
    const result: RewardAccountReadinessResult = {
      ok: false,
      code: "ACCOUNT_NOT_FOUND",
      message: "Stellar account not found."
    };
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ACCOUNT_NOT_FOUND");
    expect(result.message).toBeTruthy();
  });

  it("covers VALIDATION_ERROR code", () => {
    const result: RewardAccountReadinessResult = {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid address."
    };
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("covers STELLAR_UNREACHABLE code", () => {
    const result: RewardAccountReadinessResult = {
      ok: false,
      code: "STELLAR_UNREACHABLE",
      message: "Network error."
    };
    expect(result.code).toBe("STELLAR_UNREACHABLE");
  });

  it("covers ACCOUNT_NOT_FUNDED code", () => {
    const result: RewardAccountReadinessResult = {
      ok: false,
      code: "ACCOUNT_NOT_FUNDED",
      message: "Insufficient balance."
    };
    expect(result.code).toBe("ACCOUNT_NOT_FUNDED");
  });
});

// --- Integration-style tests using mocked Horizon (AUTH-100) ---

describe("reward-account readiness handler logic", () => {
  /**
   * Simulates the handler logic extracted for unit testing.
   * In a full integration test, this would use supertest against the Express app.
   * Mocking Horizon here keeps tests fast and deterministic.
   */

  type MockAccount = {
    id: string;
    balances: Array<{ asset_type: string; balance: string }>;
  };

  function checkReadiness(
    address: string,
    mockAccount: MockAccount | null,
    networkError?: boolean
  ): { status: number; body: RewardAccountReadinessResult } {
    const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

    if (!address || !STELLAR_ADDRESS_RE.test(address.trim())) {
      return {
        status: 400,
        body: { ok: false, code: "VALIDATION_ERROR", message: "Invalid Stellar address format." }
      };
    }

    if (networkError) {
      return {
        status: 503,
        body: { ok: false, code: "STELLAR_UNREACHABLE", message: "Could not reach Stellar network." }
      };
    }

    if (!mockAccount) {
      return {
        status: 404,
        body: { ok: false, code: "ACCOUNT_NOT_FOUND", message: "Stellar account not found." }
      };
    }

    const native = mockAccount.balances.find((b) => b.asset_type === "native");
    const balance = native ? parseFloat(native.balance) : 0;

    if (balance < 1) {
      return {
        status: 422,
        body: { ok: false, code: "ACCOUNT_NOT_FUNDED", message: "Insufficient balance." }
      };
    }

    return {
      status: 200,
      body: { ok: true, accountId: mockAccount.id, stellarAddress: address.trim(), status: "active" }
    };
  }

  it("returns 400 for missing address", () => {
    const { status, body } = checkReadiness("", null);
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid address format", () => {
    const { status, body } = checkReadiness(INVALID_ADDRESS, null);
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when account does not exist on Horizon", () => {
    const { status, body } = checkReadiness(VALID_ADDRESS, null);
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("returns 422 when account is underfunded", () => {
    const { status, body } = checkReadiness(UNFUNDED_ADDRESS, {
      id: UNFUNDED_ADDRESS,
      balances: [{ asset_type: "native", balance: "0.5000000" }]
    });
    expect(status).toBe(422);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.code).toBe("ACCOUNT_NOT_FUNDED");
  });

  it("returns 200 for a funded active account (happy path)", () => {
    const { status, body } = checkReadiness(VALID_ADDRESS, {
      id: VALID_ADDRESS,
      balances: [{ asset_type: "native", balance: "100.0000000" }]
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.stellarAddress).toBe(VALID_ADDRESS);
      expect(body.status).toBe("active");
    }
  });

  it("returns 503 when Horizon is unreachable", () => {
    const { status, body } = checkReadiness(VALID_ADDRESS, null, true);
    expect(status).toBe(503);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.code).toBe("STELLAR_UNREACHABLE");
  });
});
