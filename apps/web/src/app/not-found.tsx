import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-form" style={{ textAlign: 'center', gap: '1.5rem' }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>404</h1>
        <p style={{ color: '#666', margin: 0 }}>
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9375rem',
          }}
        >
          Go to login
        </Link>
      </div>
    </main>
  );
}
