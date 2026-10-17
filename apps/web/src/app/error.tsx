'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <main className="auth-page">
      <div className="auth-form" style={{ textAlign: 'center', gap: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Something went wrong</h1>
        <p style={{ color: '#666', margin: 0 }}>
          An unexpected error occurred. You can try again or return to the login page.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.25rem',
              background: '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9375rem',
            }}
          >
            Try again
          </button>
          <Link
            href="/login"
            style={{
              padding: '0.625rem 1.25rem',
              background: 'transparent',
              color: '#1a1a1a',
              border: '1px solid #d0d0d5',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.9375rem',
            }}
          >
            Go to login
          </Link>
        </div>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#999', margin: 0 }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
