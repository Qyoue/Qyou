import type { Metadata } from "next";
import RegisterForm from "../../components/RegisterForm";

export const metadata: Metadata = {
  title: "Create account — Qyou",
  description: "Register for a Qyou account.",
};

export default function RegisterPage() {
  return (
    <main
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem 1rem",
      }}
    >
      <RegisterForm />
    </main>
  );
}
