"use client";

import { useState, type FormEvent } from "react";
import { loginAccount, verifyEmailToken } from "../lib/auth-api";
import { logAuth } from "../lib/auth-logger";

const MIN_PASSWORD_LEN = 8;

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

function validate(email: string, password: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
  if (password.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
  return null;
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [lastSubmitMs, setLastSubmitMs] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmitMs < 1200) {
      setState({ status: "error", message: "Please wait a moment before retrying." });
      return;
    }
    setLastSubmitMs(now);

    logAuth("info", "LOGIN_ATTEMPT", { email });
    const invalid = validate(email, password);
    if (invalid) {
      logAuth("warn", "LOGIN_INVALID", { email, reason: invalid });
      setState({ status: "error", message: invalid });
      return;
    }

    setState({ status: "submitting" });
    try {
      const result = await loginAccount({ email, password });
      if (result.ok) {
        logAuth("info", "LOGIN_OK", { email, accountId: result.accountId });
        setState({ status: "success", email: result.email });
        setPassword("");
      } else {
        logAuth("warn", "LOGIN_ERROR", { email, code: result.code, message: result.message });
        setState({ status: "error", message: "Invalid credentials or unavailable session. Please try again." });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected login error.";
      logAuth("error", "LOGIN_ERROR", { email, error: message });
      setState({ status: "error", message: "Unable to sign in right now. Please retry." });
    }
  }

  if (state.status === "success") {
    return <p role="status">Signed in as {state.email}. Session established.</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Login">
      {state.status === "error" && <p role="alert">{state.message}</p>}
      <label htmlFor="login-email">Email</label>
      <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="login-password">Password</label>
      <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Signing in..." : "Sign in"}
      </button>
      <button type="button" onClick={() => setShowReset((v) => !v)}>
        Forgot password?
      </button>
      {showReset && (
        <section aria-live="polite">
          <p>Password reset flow</p>
          <ol>
            <li>Submit account email.</li>
            <li>Receive reset link token in email.</li>
            <li>Open reset link and set a new password.</li>
            <li>Re-login with new credentials.</li>
          </ol>
          <p>Failure states: unknown email, expired token, weak password, replayed token.</p>
        </section>
      )}
      <section aria-live="polite" style={{ marginTop: "1rem" }}>
        <label htmlFor="verify-token">Verification token</label>
        <input id="verify-token" type="text" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            const token = verifyToken.trim();
            if (token.length !== 36) {
              setVerifyMsg("Token must be 36 characters.");
              return;
            }
            try {
              const result = await verifyEmailToken(token);
              setVerifyMsg(result.ok ? "Email verified successfully." : "Verification failed.");
            } catch {
              setVerifyMsg("Network error while verifying email.");
            }
          }}
        >
          Verify email
        </button>
        {verifyMsg && <p role="status">{verifyMsg}</p>}
      </section>
    </form>
  );
}
