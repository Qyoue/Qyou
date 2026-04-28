"use client";

import { useEffect, useState } from "react";
import type { QueueReport } from "@qyou/types";

type Props = {
  locationId?: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; reports: QueueReport[] }
  | { status: "error"; message: string };

const LEVEL_COLORS: Record<string, string> = {
  none: "#22c55e",
  low: "#84cc16",
  medium: "#f59e0b",
  high: "#ef4444",
  unknown: "#94a3b8",
};

export default function QueueReportReviewList({ locationId }: Props) {
  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    setState({ status: "loading" });
    const url = locationId
      ? `/api/admin/queue-reports?locationId=${encodeURIComponent(locationId)}`
      : `/api/admin/queue-reports`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { success: boolean; data?: { reports: QueueReport[] }; error?: { message: string } };
        if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
        setState({ status: "success", reports: json.data?.reports ?? [] });
      })
      .catch((err: unknown) => {
        setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load reports" });
      });
  }, [locationId]);

  if (state.status === "loading" || state.status === "idle") {
    return <p style={styles.muted}>Loading reports…</p>;
  }

  if (state.status === "error") {
    return <p style={styles.error}>Error: {state.message}</p>;
  }

  const { reports } = state;

  if (reports.length === 0) {
    return <p style={styles.muted}>No queue reports found.</p>;
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Level</th>
            <th style={styles.th}>Wait (min)</th>
            <th style={styles.th}>Notes</th>
            <th style={styles.th}>Reported At</th>
            <th style={styles.th}>User</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} style={styles.tr}>
              <td style={styles.td}>
                <span style={{ ...styles.badge, background: LEVEL_COLORS[r.level] ?? "#94a3b8" }}>
                  {r.level}
                </span>
              </td>
              <td style={styles.td}>{r.waitTimeMinutes ?? "—"}</td>
              <td style={styles.td}>{r.notes || "—"}</td>
              <td style={styles.td}>{new Date(r.reportedAt).toLocaleString()}</td>
              <td style={styles.td}>{r.userId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 600 },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "8px 12px", color: "#334155" },
  badge: { color: "#fff", borderRadius: 4, padding: "2px 8px", fontWeight: 600, fontSize: 12 },
  muted: { color: "#94a3b8", margin: 0 },
  error: { color: "#ef4444", margin: 0 },
};
