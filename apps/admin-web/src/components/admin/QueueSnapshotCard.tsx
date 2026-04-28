"use client";

import type { QueueSnapshot } from "@qyou/types";

const LEVEL_COLORS: Record<string, string> = {
  none: "#22c55e",
  low: "#84cc16",
  medium: "#f59e0b",
  high: "#ef4444",
  unknown: "#94a3b8",
};

const LEVEL_LABELS: Record<string, string> = {
  none: "No Queue",
  low: "Low",
  medium: "Medium",
  high: "High",
  unknown: "Unknown",
};

type Props = {
  snapshot: QueueSnapshot | null | undefined;
  loading?: boolean;
};

export default function QueueSnapshotCard({ snapshot, loading }: Props) {
  if (loading) {
    return (
      <div style={styles.card}>
        <p style={styles.muted}>Loading queue data…</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div style={styles.card}>
        <p style={styles.muted}>No queue data available.</p>
      </div>
    );
  }

  const color = LEVEL_COLORS[snapshot.level] ?? LEVEL_COLORS.unknown;
  const label = LEVEL_LABELS[snapshot.level] ?? snapshot.level;
  const updatedAt = snapshot.lastUpdatedAt
    ? new Date(snapshot.lastUpdatedAt).toLocaleString()
    : "—";

  return (
    <div style={styles.card}>
      {snapshot.isStale && (
        <div style={styles.staleBanner}>⚠ Stale data — last update may be outdated</div>
      )}
      <div style={styles.row}>
        <span style={{ ...styles.levelBadge, backgroundColor: color }}>{label}</span>
        {snapshot.estimatedWaitMinutes != null && (
          <span style={styles.wait}>~{snapshot.estimatedWaitMinutes} min wait</span>
        )}
      </div>
      <div style={styles.meta}>
        <span>Reports: {snapshot.reportCount}</span>
        <span>Confidence: {Math.round(snapshot.confidence * 100)}%</span>
        <span>Updated: {updatedAt}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "12px 16px",
    background: "#fff",
    fontSize: 14,
  },
  staleBanner: {
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 4,
    padding: "4px 8px",
    marginBottom: 8,
    fontSize: 12,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  levelBadge: {
    color: "#fff",
    borderRadius: 4,
    padding: "2px 10px",
    fontWeight: 600,
    fontSize: 13,
  },
  wait: {
    color: "#475569",
    fontWeight: 500,
  },
  meta: {
    display: "flex",
    gap: 16,
    color: "#64748b",
    fontSize: 12,
  },
  muted: {
    color: "#94a3b8",
    margin: 0,
  },
};
