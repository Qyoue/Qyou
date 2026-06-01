/**
 * Biometric session restore — AUTH-070
 *
 * Manages storing and restoring a session token using the device's secure
 * storage (SecureStore on Expo). Biometric authentication gates the restore
 * path so the token is only returned after the user authenticates.
 *
 * Boundaries
 * ----------
 * - This module owns the secure-storage key and the biometric prompt.
 * - Callers receive a plain token string or null; they own routing.
 * - All side-effects (storage, biometric) are injected so tests can mock them.
 */

export const SESSION_KEY = "qyou.session.token";

export type BiometricResult =
  | { success: true; token: string }
  | { success: false; reason: "no_token" | "biometric_failed" | "storage_error" };

export interface SecureStorageAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface BiometricAuthAdapter {
  /** Returns true when the device supports and has enrolled biometrics. */
  isAvailable(): Promise<boolean>;
  /** Prompts the user; resolves true on success, false on cancel/failure. */
  authenticate(prompt: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Persist a session token to secure storage.
 */
export async function saveSession(
  token: string,
  storage: SecureStorageAdapter
): Promise<void> {
  await storage.setItemAsync(SESSION_KEY, token);
}

/**
 * Clear the stored session token (e.g. on explicit logout).
 */
export async function clearSession(storage: SecureStorageAdapter): Promise<void> {
  await storage.deleteItemAsync(SESSION_KEY);
}

/**
 * Restore a session token after biometric authentication.
 *
 * Flow:
 *  1. Read token from secure storage.
 *  2. If absent → return { success: false, reason: "no_token" }.
 *  3. Prompt biometric auth.
 *  4. If auth fails → return { success: false, reason: "biometric_failed" }.
 *  5. Return { success: true, token }.
 */
export async function restoreSession(
  storage: SecureStorageAdapter,
  biometric: BiometricAuthAdapter,
  prompt = "Authenticate to restore your session"
): Promise<BiometricResult> {
  let token: string | null;
  try {
    token = await storage.getItemAsync(SESSION_KEY);
  } catch {
    return { success: false, reason: "storage_error" };
  }

  if (!token) {
    return { success: false, reason: "no_token" };
  }

  let authenticated: boolean;
  try {
    authenticated = await biometric.authenticate(prompt);
  } catch {
    return { success: false, reason: "biometric_failed" };
  }

  if (!authenticated) {
    return { success: false, reason: "biometric_failed" };
  }

  return { success: true, token };
}
