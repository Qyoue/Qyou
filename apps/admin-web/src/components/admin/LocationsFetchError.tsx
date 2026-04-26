"use client";

import { useRouter } from "next/navigation";

type Props = {
  /** Human-readable reason surfaced from the failed fetch, if available. */
  reason?: string;
};

/**
 * Shown inside the admin locations page when the API fetch fails.
 * Covers issue #185 – fetch-error UX for admin location listings.
 *
 * Handles two common failure modes:
 *  - Auth failure (401/403) → redirect to login.
 *  - Generic API/network error → retry in place.
 */
export default function LocationsFetchError({ reason }: Props) {
  const router = useRouter();

  const isAuthError =
    reason?.toLowerCase().includes("unauthorized") ||
    reason?.toLowerCase().includes("forbidden");

  const handleRetry = () => router.refresh();
  const handleLogin = () => router.push("/login");

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        padding: "3rem 1rem",
        textAlign: "center",
        color: "#6b7280",
      }}
    >
      <span style={{ fontSize: "2.5rem" }} aria-hidden="true">
        ⚠️
      </span>

      <p style={{ margin: 0, fontWeight: 600, color: "#ef4444" }}>
        {isAuthError ? "Session expired or access denied." : "Failed to load locations."}
      </p>

      {reason && !isAuthError && (
        <p style={{ margin: 0, fontSize: "0.875rem" }}>{reason}</p>
      )}

      <p style={{ margin: 0, fontSize: "0.875rem" }}>
        {isAuthError
          ? "Please log in again to continue."
          : "Check your connection or API configuration and try again."}
      </p>

      <button
        onClick={isAuthError ? handleLogin : handleRetry}
        style={{
          padding: "0.5rem 1.25rem",
          background: isAuthError ? "#ef4444" : "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          cursor: "pointer",
        }}
      >
        {isAuthError ? "Go to Login" : "Retry"}
      </button>
    </div>
  );
}
