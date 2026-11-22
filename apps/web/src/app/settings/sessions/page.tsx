"use client";

import { useEffect, useState } from "react";

type Session = { id: string; current?: boolean; userAgent?: string; createdAt?: string; ip?: string };

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string>("");

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/auth/sessions");
      if (!res.ok) throw new Error("unavailable");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : data.sessions ?? []);
    } catch {
      setError("Sessions API unavailable. This UI is ready for API #5/#6.");
    }
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" }).catch(() => null);
    await load();
  }

  return (
    <main className="auth-page"><div className="auth-form">
      <h1>Active sessions</h1>
      {error && <p role="alert">{error}</p>}
      <ul>
        {sessions.map((s) => (
          <li key={s.id}>
            <div>{s.userAgent ?? "Unknown device"} {s.current ? "(current)" : ""}</div>
            <div>{s.ip ?? ""} {s.createdAt ?? ""}</div>
            {!s.current && <button type="button" onClick={() => revoke(s.id)}>Revoke</button>}
          </li>
        ))}
      </ul>
      {sessions.length === 0 && !error && <p>No active sessions found.</p>}
    </div></main>
  );
}
