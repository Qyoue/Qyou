/**
 * ProtectedShell — AUTH-072
 *
 * Wraps the authenticated portion of the app. On mount it:
 *  1. Attempts biometric session restore.
 *  2. If restore succeeds → renders children with the session token in context.
 *  3. If restore fails (no token, biometric cancelled, storage error) → calls
 *     onUnauthenticated so the caller can redirect to the login screen.
 *
 * Design decisions
 * ----------------
 * - Storage and biometric adapters are injected props so the shell is testable
 *   without native modules.
 * - A `bootstrapping` state prevents a flash of protected content before the
 *   restore attempt completes.
 * - The session token is exposed via SessionContext so any descendant can read
 *   it without prop-drilling.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import {
  restoreSession,
  type SecureStorageAdapter,
  type BiometricAuthAdapter,
} from "./biometric-session";

// ---------------------------------------------------------------------------
// Session context
// ---------------------------------------------------------------------------

type SessionContextValue = {
  token: string;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside ProtectedShell");
  return ctx;
}

// ---------------------------------------------------------------------------
// ProtectedShell
// ---------------------------------------------------------------------------

export type ProtectedShellProps = {
  storage: SecureStorageAdapter;
  biometric: BiometricAuthAdapter;
  onUnauthenticated: (reason: "no_token" | "biometric_failed" | "storage_error") => void;
  children: React.ReactNode;
  /** Override the biometric prompt text. */
  biometricPrompt?: string;
  /** Rendered while the restore attempt is in progress. Defaults to a spinner. */
  loadingFallback?: React.ReactNode;
};

export function ProtectedShell({
  storage,
  biometric,
  onUnauthenticated,
  children,
  biometricPrompt,
  loadingFallback,
}: ProtectedShellProps): React.ReactElement | null {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    restoreSession(storage, biometric, biometricPrompt).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setToken(result.token);
      } else {
        onUnauthenticated(result.reason);
      }
      setBootstrapping(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bootstrapping) {
    return (
      <View style={styles.center}>
        {loadingFallback ?? <ActivityIndicator testID="shell-loading" />}
      </View>
    );
  }

  if (!token) return null;

  return (
    <SessionContext.Provider value={{ token }}>
      {children}
    </SessionContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
