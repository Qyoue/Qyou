import type { Metadata } from "next";
import LoginForm from "../../../src/components/LoginForm";

export const metadata: Metadata = {
  title: "Login — Qyou",
  description: "Sign in to Qyou.",
};

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "1rem" }}>
      <h1>Sign in</h1>
      <LoginForm />
    </main>
  );
}
