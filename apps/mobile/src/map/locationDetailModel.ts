/**
 * locationDetailModel – normalises NearbyLocationItem and LocationDetailsItem
 * into a single LocationSheetDetails shape so the bottom-sheet never needs
 * ad hoc casts between the two API response types.
 * Issue #175
 */

import type { LocationDetailsItem, NearbyLocationItem } from "@qyou/types";
import type { LocationSheetDetails } from "./LocationBottomSheet";

export const fromNearby = (item: NearbyLocationItem): LocationSheetDetails => ({
  id: item._id,
  name: item.name,
  type: item.type,
  address: item.address ?? "",
  status: item.status,
  distanceFromUser: item.distanceFromUser,
  queueSnapshot: item.queueSnapshot
    ? {
        level: item.queueSnapshot.level,
        estimatedWaitMinutes: item.queueSnapshot.estimatedWaitMinutes,
        confidence: item.queueSnapshot.confidence,
        lastUpdatedAt: item.queueSnapshot.lastUpdatedAt ?? null,
        isStale: item.queueSnapshot.isStale,
      }
    : undefined,
});

export const fromDetail = (item: LocationDetailsItem): LocationSheetDetails => ({
  id: item._id,
  name: item.name,
  type: item.type,
  address: item.address ?? "",
  status: item.status,
  distanceFromUser: undefined,
  queueSnapshot: item.queueSnapshot
    ? {
        level: item.queueSnapshot.level,
        estimatedWaitMinutes: item.queueSnapshot.estimatedWaitMinutes,
        confidence: item.queueSnapshot.confidence,
        lastUpdatedAt: item.queueSnapshot.lastUpdatedAt ?? null,
        isStale: item.queueSnapshot.isStale,
      }
    : undefined,
});

/** Merge a nearby stub with a freshly-fetched detail, preferring detail fields. */
export const mergeDetailOntoNearby = (
  nearby: LocationSheetDetails,
  detail: LocationDetailsItem
): LocationSheetDetails => ({ ...fromDetail(detail), distanceFromUser: nearby.distanceFromUser });
