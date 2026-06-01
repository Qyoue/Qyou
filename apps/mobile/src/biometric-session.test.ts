/**
 * AUTH-070 — Biometric session restore tests.
 *
 * Run with:
 *   npx jest src/biometric-session.test.ts
 *
 * Coverage
 * --------
 * - Happy path: token present + biometric succeeds → returns token.
 * - No stored token → returns no_token without prompting biometric.
 * - Biometric cancelled/failed → returns biometric_failed.
 * - Biometric throws → returns biometric_failed (resilience).
 * - Storage read throws → returns storage_error.
 * - saveSession persists the token under SESSION_KEY.
 * - clearSession removes the token.
 * - Biometric prompt string is forwarded to the adapter.
 */

import {
  restoreSession,
  saveSession,
  clearSession,
  SESSION_KEY,
  type SecureStorageAdapter,
  type BiometricAuthAdapter,
} from "./biometric-session";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample";

function makeStorage(initial: string | null = null): jest.Mocked<SecureStorageAdapter> {
  const store: Record<string, string> = initial ? { [SESSION_KEY]: initial } : {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { store[key] = value; }),
    deleteItemAsync: jest.fn(async (key: string) => { delete store[key]; }),
  };
}

function makeBiometric(succeeds = true): jest.Mocked<BiometricAuthAdapter> {
  return {
    isAvailable: jest.fn(async () => true),
    authenticate: jest.fn(async (_prompt: string) => succeeds),
  };
}

// ---------------------------------------------------------------------------
// restoreSession — happy path
// ---------------------------------------------------------------------------

describe("restoreSession — happy path", () => {
  it("returns success:true and the token when storage has a token and biometric succeeds", async () => {
    const storage = makeStorage(SAMPLE_TOKEN);
    const biometric = makeBiometric(true);

    const result = await restoreSession(storage, biometric);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("unreachable");
    expect(result.token).toBe(SAMPLE_TOKEN);
  });

  it("reads from SESSION_KEY", async () => {
    const storage = makeStorage(SAMPLE_TOKEN);
    const biometric = makeBiometric(true);

    await restoreSession(storage, biometric);

    expect(storage.getItemAsync).toHaveBeenCalledWith(SESSION_KEY);
  });

  it("forwards the prompt string to the biometric adapter", async () => {
    const storage = makeStorage(SAMPLE_TOKEN);
    const biometric = makeBiometric(true);
    const customPrompt = "Unlock Qyou";

    await restoreSession(storage, biometric, customPrompt);

    expect(biometric.authenticate).toHaveBeenCalledWith(customPrompt);
  });
});

// ---------------------------------------------------------------------------
// restoreSession — no stored token
// ---------------------------------------------------------------------------

describe("restoreSession — no stored token", () => {
  it("returns success:false with reason no_token when storage is empty", async () => {
    const storage = makeStorage(null);
    const biometric = makeBiometric(true);

    const result = await restoreSession(storage, biometric);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.reason).toBe("no_token");
  });

  it("does not call biometric.authenticate when there is no token", async () => {
    const storage = makeStorage(null);
    const biometric = makeBiometric(true);

    await restoreSession(storage, biometric);

    expect(biometric.authenticate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// restoreSession — biometric failure
// ---------------------------------------------------------------------------

describe("restoreSession — biometric failure", () => {
  it("returns success:false with reason biometric_failed when user cancels", async () => {
    const storage = makeStorage(SAMPLE_TOKEN);
    const biometric = makeBiometric(false);

    const result = await restoreSession(storage, biometric);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.reason).toBe("biometric_failed");
  });

  it("returns biometric_failed when authenticate throws", async () => {
    const storage = makeStorage(SAMPLE_TOKEN);
    const biometric = makeBiometric(true);
    biometric.authenticate.mockRejectedValueOnce(new Error("hardware error"));

    const result = await restoreSession(storage, biometric);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.reason).toBe("biometric_failed");
  });
});

// ---------------------------------------------------------------------------
// restoreSession — storage error
// ---------------------------------------------------------------------------

describe("restoreSession — storage error", () => {
  it("returns success:false with reason storage_error when getItemAsync throws", async () => {
    const storage = makeStorage(null);
    storage.getItemAsync.mockRejectedValueOnce(new Error("keychain locked"));
    const biometric = makeBiometric(true);

    const result = await restoreSession(storage, biometric);

    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.reason).toBe("storage_error");
  });
});

// ---------------------------------------------------------------------------
// saveSession
// ---------------------------------------------------------------------------

describe("saveSession", () => {
  it("calls setItemAsync with SESSION_KEY and the token", async () => {
    const storage = makeStorage();

    await saveSession(SAMPLE_TOKEN, storage);

    expect(storage.setItemAsync).toHaveBeenCalledWith(SESSION_KEY, SAMPLE_TOKEN);
  });
});

// ---------------------------------------------------------------------------
// clearSession
// ---------------------------------------------------------------------------

describe("clearSession", () => {
  it("calls deleteItemAsync with SESSION_KEY", async () => {
    const storage = makeStorage(SAMPLE_TOKEN);

    await clearSession(storage);

    expect(storage.deleteItemAsync).toHaveBeenCalledWith(SESSION_KEY);
  });
});
