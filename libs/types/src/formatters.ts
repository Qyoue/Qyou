/**
 * Shared formatting helpers for queue timestamps, distances, and wait-time
 * metadata. Safe to import in both the mobile (Expo) and admin-web (Next.js)
 * workspaces.
 */

/** Format an ISO-8601 timestamp as a human-readable local date-time string. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Return a relative label like "5 min ago" or "just now". */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (isNaN(diffMs)) return '—';
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/** Format a wait-time in minutes as "X min" or "X h Y min". */
export function formatWaitTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Format a distance in metres as "X m" or "X.X km". */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return '—';
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Format a numeric queue length with a fallback for unknown values. */
export function formatQueueLength(count: number | null | undefined): string {
  if (count == null || !Number.isFinite(count)) return 'Unknown';
  return `${count} ${count === 1 ? 'person' : 'people'}`;
}
