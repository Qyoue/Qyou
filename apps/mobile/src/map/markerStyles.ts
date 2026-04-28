import type { QueueSnapshot } from "@qyou/types";

const LEVEL_COLORS: Record<string, string> = {
  none: "#22c55e",
  low: "#84cc16",
  medium: "#f59e0b",
  high: "#ef4444",
  unknown: "#94a3b8",
};

const STALE_OPACITY = 0.45;
const FRESH_OPACITY = 1.0;

export type MarkerStyle = {
  color: string;
  opacity: number;
  size: number;
};

export function getMarkerStyle(snapshot?: QueueSnapshot): MarkerStyle {
  if (!snapshot) {
    return { color: LEVEL_COLORS.unknown, opacity: STALE_OPACITY, size: 10 };
  }
  const color = LEVEL_COLORS[snapshot.level] ?? LEVEL_COLORS.unknown;
  const opacity = snapshot.isStale ? STALE_OPACITY : FRESH_OPACITY;
  // Size scales with severity
  const sizeMap: Record<string, number> = { none: 10, low: 12, medium: 14, high: 16, unknown: 10 };
  const size = sizeMap[snapshot.level] ?? 10;
  return { color, opacity, size };
}
