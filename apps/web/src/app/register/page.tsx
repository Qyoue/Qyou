'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { registerSchema } from '@qyou/shared';
import { AuthForm } from '../../components/AuthForm';
import { AuthStatus } from '../../components/AuthStatus';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../lib/auth-context';

export default function RegisterPage() {
  const { user, register, logout, isLoading } = useAuth();
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

    const result = registerSchema.safeParse({ email, password });
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
      await register(result.data.email, result.data.password);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create account.');
    }
  };

  return (
    <AuthForm
      title="Create account"
      submitLabel="Create account"
      onSubmit={handleSubmit}
      loading={isLoading}
      error={formError}
      footer={
        <p>
          Already have an account? <Link href="/login">Log in</Link>
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
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
      />
    </AuthForm>
  );
}
