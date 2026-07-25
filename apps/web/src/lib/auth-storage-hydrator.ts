import {
  storageHydrationSchema,
  type StorageHydrationPayload,
} from '@qyou/shared';

export function hydrateAuthSession(storageKey = 'qyou_auth_p4'): StorageHydrationPayload {
  if (typeof window === 'undefined') {
    return { status: 'uninitialized', hasStoredSession: false };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { status: 'hydrated', hasStoredSession: false, hydratedAt: Date.now() };
  }

  const payload: StorageHydrationPayload = {
    status: 'hydrated',
    hasStoredSession: true,
    hydratedAt: Date.now(),
  };

  const validation = storageHydrationSchema.safeParse(payload);
  return validation.success
    ? validation.data
    : { status: 'error', hasStoredSession: false, errorMessage: 'Hydration schema mismatch' };
}
