import type { Metadata } from "next";
import LoginForm from "../../../src/components/LoginForm";
import AuthSessionShell from "../../../src/components/AuthSessionShell";

export const metadata: Metadata = {
  title: "Login — Qyou",
  description: "Sign in to Qyou.",
};

export default function LoginPage() {
  return (
    <AuthSessionShell title="Sign in" subtitle="Use your email and password to restore your authenticated session.">
      <LoginForm />
    </AuthSessionShell>
  );
}
