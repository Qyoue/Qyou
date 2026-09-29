import {
  persistedStateSchema,
  type PersistedAuthState,
  type PersistenceValidationResult,
} from '@qyou/shared';

// #837: Token storage audit — auth state (access token) is stored in
// localStorage under STORAGE_KEY. This is readable by any JS running on
// the page (XSS risk). Accepted trade-off for the current SPA architecture.
// If a refresh-token flow is added, store the refresh token in an httpOnly
// cookie instead; the access token can remain in memory only (not localStorage).
const STORAGE_KEY = 'qyou.web_auth_v2';

export function saveAuthState(state: PersistedAuthState): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function loadAndValidateAuthState(): PersistenceValidationResult {
  if (typeof window === 'undefined') {
    return { isValid: false, reason: 'SSR environment' };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { isValid: false, reason: 'No state stored' };
  }

  try {
    const parsed = JSON.parse(raw);
    const validation = persistedStateSchema.safeParse(parsed);
    if (!validation.success) {
      return { isValid: false, reason: 'Invalid state schema' };
    }

    if (Date.now() > validation.data.expiresAt) {
      return { isValid: false, reason: 'Session expired' };
    }

    return { isValid: true, state: validation.data as PersistedAuthState };
  } catch {
    return { isValid: false, reason: 'Corrupted JSON' };
  }
}
