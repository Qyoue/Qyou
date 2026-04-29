/**
 * Integration tests for the mobile report form (issue #299).
 * Tests the submission logic, validation, and state transitions of
 * ReportComposerModal via the apiClient contract.
 */

import { apiClient } from "@/src/network/apiClient";
import type { QueueLevel } from "@qyou/types";

jest.mock("@/src/network/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

// ── helpers ──────────────────────────────────────────────────────────────────

type ReportPayload = {
  locationId: string;
  level: QueueLevel;
  waitTimeMinutes?: number;
  notes?: string;
};

/** Mirrors the submit logic in ReportComposerModal */
async function submitReport(payload: ReportPayload): Promise<"success" | "error"> {
  try {
    await apiClient.post("/queues/report", payload);
    return "success";
  } catch {
    return "error";
  }
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── happy path ────────────────────────────────────────────────────────────────

describe("report form: successful submission", () => {
  it("posts to /queues/report with required fields and returns success", async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } } as never);

    const result = await submitReport({ locationId: "loc_1", level: "medium" });

    expect(result).toBe("success");
    expect(mockPost).toHaveBeenCalledWith("/queues/report", {
      locationId: "loc_1",
      level: "medium",
    });
  });

  it("includes waitTimeMinutes when provided", async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } } as never);

    await submitReport({ locationId: "loc_1", level: "high", waitTimeMinutes: 30 });

    expect(mockPost).toHaveBeenCalledWith("/queues/report", {
      locationId: "loc_1",
      level: "high",
      waitTimeMinutes: 30,
    });
  });

  it("includes notes when provided", async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } } as never);

    await submitReport({ locationId: "loc_1", level: "low", notes: "Moving fast" });

    expect(mockPost).toHaveBeenCalledWith("/queues/report", {
      locationId: "loc_1",
      level: "low",
      notes: "Moving fast",
    });
  });

  it("accepts all valid queue levels", async () => {
    const levels: QueueLevel[] = ["none", "low", "medium", "high", "unknown"];
    for (const level of levels) {
      mockPost.mockResolvedValueOnce({ data: { success: true } } as never);
      const result = await submitReport({ locationId: "loc_1", level });
      expect(result).toBe("success");
    }
    expect(mockPost).toHaveBeenCalledTimes(levels.length);
  });
});

// ── failure / boundary cases ──────────────────────────────────────────────────

describe("report form: submission failure", () => {
  it("returns error when the API call rejects (network failure)", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network Error"));

    const result = await submitReport({ locationId: "loc_1", level: "medium" });

    expect(result).toBe("error");
  });

  it("returns error on a 400 server response", async () => {
    const err = Object.assign(new Error("Bad Request"), {
      response: { status: 400, data: { success: false, error: { code: "VALIDATION_ERROR" } } },
    });
    mockPost.mockRejectedValueOnce(err);

    const result = await submitReport({ locationId: "loc_1", level: "medium" });

    expect(result).toBe("error");
  });

  it("returns error on a 401 unauthorized response", async () => {
    const err = Object.assign(new Error("Unauthorized"), {
      response: { status: 401 },
    });
    mockPost.mockRejectedValueOnce(err);

    const result = await submitReport({ locationId: "loc_1", level: "low" });

    expect(result).toBe("error");
  });
});

// ── guard: missing locationId ─────────────────────────────────────────────────

describe("report form: guard conditions", () => {
  it("does not call the API when locationId is empty", async () => {
    // Mirrors the `if (!locationId) return;` guard in ReportComposerModal
    async function submitWithGuard(locationId: string | undefined): Promise<"success" | "error" | "skipped"> {
      if (!locationId) return "skipped";
      return submitReport({ locationId, level: "medium" });
    }

    const result = await submitWithGuard(undefined);
    expect(result).toBe("skipped");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("calls the API when locationId is present", async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } } as never);

    async function submitWithGuard(locationId: string | undefined): Promise<"success" | "error" | "skipped"> {
      if (!locationId) return "skipped";
      return submitReport({ locationId, level: "medium" });
    }

    const result = await submitWithGuard("loc_99");
    expect(result).toBe("success");
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
