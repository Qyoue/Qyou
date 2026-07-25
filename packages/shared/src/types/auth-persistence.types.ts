export type StorageMechanism = 'localStorage' | 'sessionStorage' | 'memory';

export interface PersistedAuthState {
  token: string;
  userId: string;
  savedAt: number;
  expiresAt: number;
  mechanism: StorageMechanism;
}

export interface PersistenceValidationResult {
  isValid: boolean;
  reason?: string;
  state?: PersistedAuthState;
}
