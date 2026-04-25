"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface FormState {
  email: string;
  password: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(fields: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.email.trim()) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = "Enter a valid email.";
  if (!fields.password) errors.password = "Password is required.";
  else if (fields.password.length < 6) errors.password = "Password must be at least 6 characters.";
  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  const [fields, setFields] = useState<FormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setServerError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate(fields);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError((body as { message?: string }).message || "Login failed. Check your credentials.");
        return;
      }
      router.push("/admin");
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={fields.email} onChange={handleChange} disabled={submitting} />
          {errors.email && <p role="alert" style={{ color: "red", fontSize: 13 }}>{errors.email}</p>}
        </div>
        <div style={{ marginTop: 12 }}>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={fields.password} onChange={handleChange} disabled={submitting} />
          {errors.password && <p role="alert" style={{ color: "red", fontSize: 13 }}>{errors.password}</p>}
        </div>
        {serverError && <p role="alert" style={{ color: "red", marginTop: 8 }}>{serverError}</p>}
        <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
