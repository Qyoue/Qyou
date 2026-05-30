import type { ReactNode } from "react";

export default function AuthSessionShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main style={{ alignItems: "center", display: "flex", justifyContent: "center", minHeight: "100vh", padding: "2rem 1rem" }}>
      <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "20px", boxShadow: "0 12px 48px rgba(66,40,26,0.10)", maxWidth: "520px", padding: "2rem", width: "100%" }}>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p style={{ color: "var(--muted)", marginTop: "-0.4rem", marginBottom: "1.2rem" }}>{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
