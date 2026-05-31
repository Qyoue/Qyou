import type { Metadata } from "next";
import RegisterForm from "../../components/RegisterForm";
import AuthSessionShell from "../../components/AuthSessionShell";

export const metadata: Metadata = {
  title: "Create account — Qyou",
  description: "Register for a Qyou account.",
};

export default function RegisterPage() {
  return (
    <AuthSessionShell title="Create account" subtitle="Start with a secure account before joining sessions.">
      <RegisterForm />
    </AuthSessionShell>
  );
}
