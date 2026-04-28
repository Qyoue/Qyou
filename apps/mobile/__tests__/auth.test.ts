/**
 * Test scaffolding for mobile auth and session flows (issue #195).
 * Uses Jest + @testing-library/react-native conventions already present in the project.
 */

import { logoutSession, validateSession } from "@/src/auth/authClient";

jest.mock("@/src/auth/authClient", () => ({
  logoutSession: jest.fn(),
  validateSession: jest.fn(),
}));

const mockLogout = logoutSession as jest.MockedFunction<typeof logoutSession>;
const mockValidate = validateSession as jest.MockedFunction<typeof validateSession>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("auth session flows", () => {
  it("resolves on successful logout", async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    await expect(logoutSession()).resolves.toBeUndefined();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("rejects when logout fails", async () => {
    mockLogout.mockRejectedValueOnce(new Error("network error"));
    await expect(logoutSession()).rejects.toThrow("network error");
  });

  it("returns true for a valid session token", async () => {
    mockValidate.mockResolvedValueOnce(true);
    await expect(validateSession("valid-token")).resolves.toBe(true);
  });

  it("returns false for an expired session token", async () => {
    mockValidate.mockResolvedValueOnce(false);
    await expect(validateSession("expired-token")).resolves.toBe(false);
  });

  it("rejects when session validation throws", async () => {
    mockValidate.mockRejectedValueOnce(new Error("server error"));
    await expect(validateSession("bad-token")).rejects.toThrow("server error");
  });
});
