'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';

function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [expired, setExpired] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('');
    setError('');
    setExpired(false);
    if (!token) { setError('Reset token is missing.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) { setStatus('Password reset successful. You can now sign in.'); return; }
      const data = await res.json().catch(() => ({}));
      const msg = data?.message || data?.error || 'Unable to reset password.';
      if (res.status === 410 || /expired|invalid/i.test(String(msg))) setExpired(true);
      setError(String(msg));
    } catch {
      setError('Unable to reset password. Please try again.');
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-form">
        <h1>Reset password</h1>
        {!token && <p role="alert">Missing or invalid reset link.</p>}
        {expired && <p role="alert">This reset link has expired. Request a new one.</p>}
        <form onSubmit={onSubmit}>
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <p aria-live="polite">Strength: {strength.label}</p>
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          <button type="submit">Reset password</button>
        </form>
        {status && <p role="status">{status}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </main>
  );
}
