/**
 * AUTH-074: Protected mobile navigation shell — instrumented.
 *
 * Wraps authenticated screens. Emits structured log events at each
 * checkpoint so contributors can trace bootstrap timing and auth-gate
 * decisions in development and production.
 *
 * Lifecycle events:
 *   PROTECTED_SHELL_MOUNT       — component mounted, bootstrap starting
 *   PROTECTED_SHELL_CHECKING    — session check in progress
 *   PROTECTED_SHELL_AUTHED      — valid session found, rendering children
 *   PROTECTED_SHELL_UNAUTHED    — no session, redirecting to login
 *   PROTECTED_SHELL_ERROR       — unexpected error during session check
 */

import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthState = "checking" | "authenticated" | "unauthenticated" | "error";

export type ProtectedShellProps = {
  /** Resolved auth state injected by the caller (or a hook). */
  authState: AuthState;
  /** Rendered when authenticated. */
  children: React.ReactNode;
  /** Optional override for the redirect/login surface. */
  fallback?: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Instrumentation
// ---------------------------------------------------------------------------

function logShell(event: string, meta: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), context: "protected-shell", event, ...meta }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProtectedShell({ authState, children, fallback }: ProtectedShellProps) {
  const [prevState, setPrevState] = useState<AuthState | null>(null);

  useEffect(() => {
    logShell("PROTECTED_SHELL_MOUNT", { checkpoint: "mount" });
    return () => {
      logShell("PROTECTED_SHELL_UNMOUNT", { checkpoint: "unmount" });
    };
  }, []);

  useEffect(() => {
    if (authState === prevState) return;
    setPrevState(authState);

    switch (authState) {
      case "checking":
        logShell("PROTECTED_SHELL_CHECKING", { checkpoint: "session_check_start" });
        break;
      case "authenticated":
        logShell("PROTECTED_SHELL_AUTHED", { checkpoint: "session_valid" });
        break;
      case "unauthenticated":
        logShell("PROTECTED_SHELL_UNAUTHED", { checkpoint: "redirect_to_login" });
        break;
      case "error":
        logShell("PROTECTED_SHELL_ERROR", { checkpoint: "session_check_failed" });
        break;
    }
  }, [authState, prevState]);

  if (authState === "checking") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.label}>Checking session…</Text>
      </View>
    );
  }

  if (authState === "authenticated") {
    return <>{children}</>;
  }

  // unauthenticated or error — show fallback or a minimal gate message
  return (
    <View style={styles.center}>
      {fallback ?? <Text style={styles.label}>Please sign in to continue.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  label: { color: "#5f584f", fontSize: 15 },
});
