import type { FormEvent, ReactNode } from 'react';
import { Button } from './Button';
import { FormError } from './FormError';

interface AuthFormProps {
  title: string;
  submitLabel: string;
  loading: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthForm({
  title,
  submitLabel,
  loading,
  error,
  onSubmit,
  children,
  footer,
}: AuthFormProps) {
  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <h1>{title}</h1>
        {children}
        <FormError message={error} />
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        {footer ? <div className="auth-form-footer">{footer}</div> : null}
      </form>
    </main>
  );
}
