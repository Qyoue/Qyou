"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Unable to sign in.");
      }

      router.replace("/admin/locations");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login">
      <div className="admin-login__panel">
        <p className="admin-login__eyebrow">Qyou Admin</p>
        <h1 className="admin-login__title">Sign in</h1>
        <p className="admin-login__copy">
          Use an administrator account to manage seeded locations and review queue operations.
        </p>

        <label className="admin-login__label">Email</label>
        <input
          className="admin-login__input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
        />

        <label className="admin-login__label">Password</label>
        <input
          className="admin-login__input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
        />

        {error ? <p className="admin-login__error">{error}</p> : null}

        <button className="admin-login__button" onClick={() => void submit()} disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Continue"}
        </button>
      </div>
    </main>
  );
}

