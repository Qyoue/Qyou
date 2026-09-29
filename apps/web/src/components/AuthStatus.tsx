// #834: logout button is present; onLogout should clear local auth state
// (localStorage + context) and call the backend logout endpoint when it ships.
interface AuthStatusProps {
  email: string;
  onLogout: () => void;
}

export function AuthStatus({ email, onLogout }: AuthStatusProps) {
  return (
    <main className="auth-page">
      <div className="auth-form">
        <h1>You&apos;re signed in</h1>
        <p>
          Signed in as <strong>{email}</strong>.
        </p>
        <button type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </main>
  );
}
