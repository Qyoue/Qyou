'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginSchema } from '@qyou/shared';
import { AuthForm } from '../../components/AuthForm';
import { AuthStatus } from '../../components/AuthStatus';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../lib/auth-context';
import { getSafeNextPath } from '../../lib/safe-next';

export default function LoginPage() {
  const { user, login, logout, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (user) {
    return <AuthStatus email={user.email} onLogout={logout} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      await login(result.data.email, result.data.password);
      router.replace(nextPath);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to log in.');
    }
  };

  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      onSubmit={handleSubmit}
      loading={isLoading}
      error={formError}
      footer={
        <p>
          Don&apos;t have an account? <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>Create one</Link>
        </p>
      }
    >
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={fieldErrors.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
      />
    </AuthForm>
  );
}
