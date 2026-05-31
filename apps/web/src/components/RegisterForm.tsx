"use client";

import { useState, type FormEvent } from "react";
import { registerAccount } from "../lib/auth-api";
import { logAuth } from "../lib/auth-logger";

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; email: string; accountId: string }
  | { status: "error"; message: string };

const MIN_PASSWORD_LEN = 8;

function validate(email: string, password: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "A valid email address is required.";
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
  }
  return null;
}

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [form, setForm] = useState<FormState>({ status: "idle" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    logAuth("info", "REGISTER_ATTEMPT", { email });

    const validationError = validate(email, password);
    if (validationError) {
      logAuth("warn", "REGISTER_INVALID", { email, reason: validationError });
      setForm({ status: "error", message: validationError });
      return;
    }

    setForm({ status: "submitting" });

    try {
      const result = await registerAccount({
        email,
        password,
        displayName: displayName.trim() || undefined,
      });

      if (result.ok) {
        logAuth("info", "REGISTER_OK", { email, accountId: result.accountId, status: result.status });
        setForm({ status: "success", email: result.email, accountId: result.accountId });
      } else {
        logAuth("warn", "REGISTER_ERROR", { email, code: result.code, message: result.message });
        setForm({ status: "error", message: result.message });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error. Please try again.";
      logAuth("error", "REGISTER_ERROR", { email, error: message });
      setForm({ status: "error", message });
    }
  }

  if (form.status === "success") {
    return (
      <div style={styles.card} role="status" aria-live="polite">
        <p style={{ color: "var(--accent-strong)", fontWeight: 600 }}>Account created ✓</p>
        <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
          Check your inbox at <strong>{form.email}</strong> to verify your account.
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          Account ID: <code>{form.accountId}</code>
        </p>
      </div>
    );
  }

  const isSubmitting = form.status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate style={styles.card} aria-label="Create account">
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.4rem" }}>Create account</h2>

      {form.status === "error" && (
        <p role="alert" style={styles.errorBanner}>
          {form.message}
        </p>
      )}

      <label style={styles.label} htmlFor="reg-email">Email</label>
      <input
        id="reg-email"
        type="email"
        autoComplete="email"
        required
        disabled={isSubmitting}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
        aria-describedby={form.status === "error" ? "reg-error" : undefined}
      />

      <label style={styles.label} htmlFor="reg-display-name">Display name <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
      <input
        id="reg-display-name"
        type="text"
        autoComplete="nickname"
        disabled={isSubmitting}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        style={styles.input}
      />

      <label style={styles.label} htmlFor="reg-password">Password</label>
      <input
        id="reg-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LEN}
        disabled={isSubmitting}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />
      <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "-0.5rem 0 0.75rem" }}>
        Minimum {MIN_PASSWORD_LEN} characters.
      </p>

      <button type="submit" disabled={isSubmitting} style={styles.button}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
        Already have an account?{" "}
        <a href="/login" style={{ color: "var(--accent-strong)" }}>Sign in</a>
      </p>
    </form>
  );
}

const styles = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "20px",
    boxShadow: "0 12px 48px rgba(66,40,26,0.10)",
    maxWidth: "420px",
    padding: "2rem",
    width: "100%",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: "0.3rem",
  } as React.CSSProperties,
  input: {
    background: "#fff",
    border: "1px solid var(--line)",
    borderRadius: "10px",
    display: "block",
    fontSize: "1rem",
    marginBottom: "1rem",
    padding: "0.6rem 0.85rem",
    width: "100%",
  } as React.CSSProperties,
  button: {
    background: "var(--accent)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: 600,
    padding: "0.7rem 1.5rem",
    width: "100%",
  } as React.CSSProperties,
  errorBanner: {
    background: "rgba(168,61,27,0.08)",
    border: "1px solid rgba(168,61,27,0.25)",
    borderRadius: "8px",
    color: "var(--accent-strong)",
    fontSize: "0.9rem",
    marginBottom: "1rem",
    padding: "0.6rem 0.85rem",
  } as React.CSSProperties,
} as const;
