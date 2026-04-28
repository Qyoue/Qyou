"use client";

import { useState } from "react";
import type { QueueLevel } from "@qyou/types";

const LEVELS: QueueLevel[] = ["none", "low", "medium", "high", "unknown"];

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function ManualQueueReportForm() {
  const [locationId, setLocationId] = useState("");
  const [level, setLevel] = useState<QueueLevel>("medium");
  const [waitTime, setWaitTime] = useState("");
  const [notes, setNotes] = useState("");
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId.trim()) {
      setFormState({ status: "error", message: "Location ID is required." });
      return;
    }

    setFormState({ status: "submitting" });

    try {
      const res = await fetch("/api/admin/queue-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: locationId.trim(),
          level,
          waitTimeMinutes: waitTime ? Number(waitTime) : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = (await res.json()) as { success: boolean; error?: { message: string } };
      if (!json.success) throw new Error(json.error?.message ?? "Submission failed");

      setFormState({ status: "success", message: "Report submitted successfully." });
      setLocationId("");
      setLevel("medium");
      setWaitTime("");
      setNotes("");
    } catch (err: unknown) {
      setFormState({ status: "error", message: err instanceof Error ? err.message : "Submission failed" });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.heading}>Manual Queue Report Entry</h2>
      <p style={styles.description}>Seed queue activity for testing without mobile use.</p>

      {formState.status === "success" && (
        <div style={styles.successBanner}>{formState.message}</div>
      )}
      {formState.status === "error" && (
        <div style={styles.errorBanner}>{formState.message}</div>
      )}

      <label style={styles.label}>
        Location ID *
        <input
          style={styles.input}
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          placeholder="e.g. 64a1b2c3d4e5f6a7b8c9d0e1"
          required
        />
      </label>

      <label style={styles.label}>
        Queue Level *
        <select style={styles.input} value={level} onChange={(e) => setLevel(e.target.value as QueueLevel)}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>

      <label style={styles.label}>
        Estimated Wait (minutes)
        <input
          style={styles.input}
          type="number"
          min={0}
          max={300}
          value={waitTime}
          onChange={(e) => setWaitTime(e.target.value)}
          placeholder="Optional"
        />
      </label>

      <label style={styles.label}>
        Notes
        <textarea
          style={{ ...styles.input, height: 72, resize: "vertical" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          maxLength={280}
        />
      </label>

      <button
        type="submit"
        disabled={formState.status === "submitting"}
        style={formState.status === "submitting" ? { ...styles.button, opacity: 0.6 } : styles.button}
      >
        {formState.status === "submitting" ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 },
  heading: { fontSize: 18, fontWeight: 700, margin: 0 },
  description: { color: "#64748b", fontSize: 13, margin: 0 },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 500, color: "#334155" },
  input: { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14, outline: "none" },
  button: { padding: "10px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 14 },
  successBanner: { background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "8px 12px", fontSize: 13 },
  errorBanner: { background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "8px 12px", fontSize: 13 },
};
