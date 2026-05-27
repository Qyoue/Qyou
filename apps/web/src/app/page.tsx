const bootstrapPreview = {
  providers: ["email-password", "stellar-wallet-link"],
  sessionStrategy: "jwt",
  nextStep: "Ship the authentication milestone before the rest of the MVP."
} as const;

export default function HomePage() {
  return (
    <main
      style={{
        display: "grid",
        gap: "1.5rem",
        minHeight: "100vh",
        padding: "4rem 1.5rem",
        placeItems: "center"
      }}
    >
      <section
        style={{
          backdropFilter: "blur(18px)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "28px",
          boxShadow: "0 24px 80px rgba(66, 40, 26, 0.12)",
          maxWidth: "860px",
          padding: "2rem"
        }}
      >
        <p style={{ color: "var(--accent-strong)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Qyou 2.0
        </p>
        <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", lineHeight: 0.95, margin: "0.4rem 0 1rem" }}>
          Clean starter, auth-first roadmap, contributor-ready repo.
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1.7 }}>
          This web app is intentionally minimal. It gives hackathon contributors a clear place to begin while the
          authentication milestone becomes the first public development wave.
        </p>
        <pre
          style={{
            background: "#1d1d1b",
            borderRadius: "18px",
            color: "#f6f1e8",
            marginTop: "1.5rem",
            overflowX: "auto",
            padding: "1rem"
          }}
        >
          <code>{JSON.stringify(bootstrapPreview, null, 2)}</code>
        </pre>
      </section>
    </main>
  );
}
