/**
 * Frontend contract tests for nearby-location payload normalization (issue #297).
 * Verifies that NearbyLocationsResponse payloads are correctly typed and that
 * consumers can safely parse mixed queue + geo payloads including edge cases.
 */

import type {
  NearbyLocationsResponse,
  NearbyLocationItem,
  QueueSnapshot,
} from "@/src/network/contracts";

// ── helpers ──────────────────────────────────────────────────────────────────

function isSuccess<T>(
  res: { success: true; data: T } | { success: false; error: unknown }
): res is { success: true; data: T } {
  return res.success === true;
}

function normalizeNearbyItems(res: NearbyLocationsResponse): NearbyLocationItem[] {
  if (!isSuccess(res)) return [];
  return res.data.items ?? [];
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const snapshot: QueueSnapshot = {
  locationId: "loc_1",
  level: "medium",
  estimatedWaitMinutes: 15,
  reportCount: 3,
  confidence: 0.8,
  lastUpdatedAt: "2026-04-29T00:00:00.000Z",
  isStale: false,
};

const item: NearbyLocationItem = {
  _id: "loc_1",
  name: "City Bank",
  type: "bank",
  address: "1 Main St",
  status: "active",
  location: { type: "Point", coordinates: [3.3792, 6.5244] },
  distanceFromUser: 120,
  queueSnapshot: snapshot,
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("nearby-location contract: success payload", () => {
  it("normalizes a well-formed success response into an item array", () => {
    const res: NearbyLocationsResponse = { success: true, data: { items: [item] } };
    const items = normalizeNearbyItems(res);
    expect(items).toHaveLength(1);
    expect(items[0]._id).toBe("loc_1");
    expect(items[0].queueSnapshot?.level).toBe("medium");
  });

  it("returns an empty array when items is undefined", () => {
    const res: NearbyLocationsResponse = { success: true, data: { items: undefined } };
    expect(normalizeNearbyItems(res)).toEqual([]);
  });

  it("returns an empty array when items is empty", () => {
    const res: NearbyLocationsResponse = { success: true, data: { items: [] } };
    expect(normalizeNearbyItems(res)).toEqual([]);
  });

  it("preserves distanceFromUser on each item", () => {
    const res: NearbyLocationsResponse = {
      success: true,
      data: { items: [{ ...item, distanceFromUser: 500 }] },
    };
    expect(normalizeNearbyItems(res)[0].distanceFromUser).toBe(500);
  });

  it("handles items without a queueSnapshot (no queue data yet)", () => {
    const noSnapshot: NearbyLocationItem = { ...item, queueSnapshot: undefined };
    const res: NearbyLocationsResponse = { success: true, data: { items: [noSnapshot] } };
    const items = normalizeNearbyItems(res);
    expect(items[0].queueSnapshot).toBeUndefined();
  });
});

describe("nearby-location contract: failure payload", () => {
  it("returns an empty array for an API error response", () => {
    const res: NearbyLocationsResponse = {
      success: false,
      error: { code: "NOT_FOUND", message: "No locations found" },
    };
    expect(normalizeNearbyItems(res)).toEqual([]);
  });

  it("returns an empty array for an auth error", () => {
    const res: NearbyLocationsResponse = {
      success: false,
      error: { code: "AUTH_ERROR", message: "Unauthorized" },
    };
    expect(normalizeNearbyItems(res)).toEqual([]);
  });
});
