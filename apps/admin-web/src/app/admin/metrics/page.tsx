"use client";

import { useEffect, useState } from "react";

type MetricCard = { label: string; value: string | number };

type MetricsPayload = {
  activeQueues: number;
  reportsToday: number;
  activeBuddies: number;
  avgWaitMin: number;
};

async function fetchMetrics(): Promise<MetricsPayload> {
  const res = await fetch("/api/admin/metrics", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load metrics");
  return res.json() as Promise<MetricsPayload>;
}

export default function MetricsPage() {
  const [cards, setCards] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics()
      .then((data) => {
        setCards([
          { label: "Active Queues", value: data.activeQueues },
          { label: "Reports Today", value: data.reportsToday },
          { label: "Active Buddies", value: data.activeBuddies },
          { label: "Avg Wait (min)", value: data.avgWaitMin },
        ]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: 24 }}>Loading metrics…</p>;
  if (error) return <p style={{ padding: 24, color: "red" }}>Error: {error}</p>;
  if (!cards.length) return <p style={{ padding: 24 }}>No metrics available.</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 20 }}>Operational Metrics</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{c.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700 }}>{c.value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
