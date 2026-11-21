"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [status, setStatus] = useState<string>("");
  const [confirm, setConfirm] = useState("");

  async function deleteAccount() {
    setStatus("");
    const res = await fetch("/api/auth/account", { method: "DELETE" }).catch(() => null);
    if (res?.ok) setStatus("Account deletion requested.");
    else setStatus("Account deletion endpoint unavailable. Please contact support.");
  }

  return (
    <main className="auth-page"><div className="auth-form">
      <h1>Account settings</h1>
      <p>Manage your account, sessions, and deletion requests.</p>
      <a href="/settings/sessions">Manage active sessions</a>
      <hr />
      <h2>Delete account</h2>
      <p>This action is permanent. Type DELETE to confirm.</p>
      <input aria-label="Confirm deletion" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
      <button type="button" disabled={confirm !== "DELETE"} onClick={deleteAccount}>Delete account</button>
      {status && <p role="status">{status}</p>}
    </div></main>
  );
}
