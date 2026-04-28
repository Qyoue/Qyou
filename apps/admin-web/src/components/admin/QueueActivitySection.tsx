"use client";

import { useEffect, useState } from "react";
import type { QueueSnapshot } from "@qyou/types";
import QueueSnapshotCard from "./QueueSnapshotCard";
import QueueReportReviewList from "./QueueReportReviewList";

type Props = {
  locationId: string;
};

export default function QueueActivitySection({ locationId }: Props) {
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/queue-snapshot?locationId=${encodeURIComponent(locationId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { success: boolean; data?: { snapshot: QueueSnapshot }; error?: { message: string } };
        if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
        setSnapshot(json.data?.snapshot ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load snapshot");
      })
      .finally(() => setLoading(false));
  }, [locationId]);

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Queue Activity</h2>

      <div style={styles.snapshotWrap}>
        <h3 style={styles.subheading}>Current Snapshot</h3>
        {error ? (
          <p style={styles.error}>{error}</p>
        ) : (
          <QueueSnapshotCard snapshot={snapshot} loading={loading} />
        )}
      </div>

      <div style={styles.reportsWrap}>
        <h3 style={styles.subheading}>Recent Reports</h3>
        <QueueReportReviewList locationId={locationId} />
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginTop: 32 },
  heading: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  subheading: { fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 8 },
  snapshotWrap: { marginBottom: 24 },
  reportsWrap: {},
  error: { color: "#ef4444", fontSize: 13 },
};
