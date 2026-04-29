/**
 * Frontend contract tests for location-detail payload normalization (issue #298).
 * Verifies that LocationDetailsResponse payloads are correctly typed and that
 * consumers can safely parse detail responses before more UI depends on them.
 */

import type {
  LocationDetailsResponse,
  LocationDetailsItem,
  QueueSnapshot,
} from "@/src/network/contracts";

// ── helpers ──────────────────────────────────────────────────────────────────

function isSuccess<T>(
  res: { success: true; data: T } | { success: false; error: unknown }
): res is { success: true; data: T } {
  return res.success === true;
}

function normalizeLocationDetail(res: LocationDetailsResponse): LocationDetailsItem | null {
  if (!isSuccess(res)) return null;
  return res.data.item ?? null;
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const snapshot: QueueSnapshot = {
  locationId: "loc_42",
  level: "high",
  estimatedWaitMinutes: 45,
  reportCount: 7,
  confidence: 0.9,
  lastUpdatedAt: "2026-04-29T00:00:00.000Z",
  isStale: false,
};

const detailItem: LocationDetailsItem = {
  _id: "loc_42",
  name: "General Hospital",
  type: "hospital",
  address: "99 Health Ave",
  status: "active",
  location: { type: "Point", coordinates: [3.3792, 6.5244] },
  queueSnapshot: snapshot,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z",
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("location-detail contract: success payload", () => {
  it("normalizes a well-formed success response into a detail item", () => {
    const res: LocationDetailsResponse = { success: true, data: { item: detailItem } };
    const result = normalizeLocationDetail(res);
    expect(result).not.toBeNull();
    expect(result!._id).toBe("loc_42");
    expect(result!.name).toBe("General Hospital");
  });

  it("returns null when item is undefined (location not yet populated)", () => {
    const res: LocationDetailsResponse = { success: true, data: { item: undefined } };
    expect(normalizeLocationDetail(res)).toBeNull();
  });

  it("exposes queueSnapshot when present", () => {
    const res: LocationDetailsResponse = { success: true, data: { item: detailItem } };
    const result = normalizeLocationDetail(res);
    expect(result!.queueSnapshot?.level).toBe("high");
    expect(result!.queueSnapshot?.isStale).toBe(false);
  });

  it("handles a stale snapshot correctly", () => {
    const staleItem: LocationDetailsItem = {
      ...detailItem,
      queueSnapshot: { ...snapshot, isStale: true, lastUpdatedAt: null },
    };
    const res: LocationDetailsResponse = { success: true, data: { item: staleItem } };
    const result = normalizeLocationDetail(res);
    expect(result!.queueSnapshot?.isStale).toBe(true);
    expect(result!.queueSnapshot?.lastUpdatedAt).toBeNull();
  });

  it("handles an item without a queueSnapshot", () => {
    const noSnapshot: LocationDetailsItem = { ...detailItem, queueSnapshot: undefined };
    const res: LocationDetailsResponse = { success: true, data: { item: noSnapshot } };
    expect(normalizeLocationDetail(res)!.queueSnapshot).toBeUndefined();
  });

  it("preserves createdAt and updatedAt timestamps", () => {
    const res: LocationDetailsResponse = { success: true, data: { item: detailItem } };
    const result = normalizeLocationDetail(res);
    expect(result!.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(result!.updatedAt).toBe("2026-04-29T00:00:00.000Z");
  });
});

describe("location-detail contract: failure payload", () => {
  it("returns null for a NOT_FOUND error response", () => {
    const res: LocationDetailsResponse = {
      success: false,
      error: { code: "NOT_FOUND", message: "Location not found" },
    };
    expect(normalizeLocationDetail(res)).toBeNull();
  });

  it("returns null for an internal server error response", () => {
    const res: LocationDetailsResponse = {
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" },
    };
    expect(normalizeLocationDetail(res)).toBeNull();
  });
});
