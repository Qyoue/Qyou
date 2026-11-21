export type StorageHydrationStatus = 'uninitialized' | 'hydrating' | 'hydrated' | 'error';

export interface StorageHydrationPayload {
  status: StorageHydrationStatus;
  hasStoredSession: boolean;
  hydratedAt?: number;
  errorMessage?: string;
}

export interface EncryptedSessionStorageOptions {
  enableEncryption: boolean;
  storagePrefix: string;
  ttlSeconds: number;
}
