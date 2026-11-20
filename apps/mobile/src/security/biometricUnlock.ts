/**
 * Biometric unlock for returning users (#1353).
 *
 * The native prompt (for example expo-local-authentication) is injected as a
 * `BiometricAuthenticator`, so the policy below is plain TypeScript and testable.
 */
export interface BiometricAuthenticator {
  isAvailable(): Promise<boolean>;
  authenticate(promptMessage: string): Promise<boolean>;
}

export interface UnlockStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface BiometricGateOptions {
  authenticator: BiometricAuthenticator;
  storage: UnlockStorage;
  /** Re-lock after the app has been in the background this long. Default 1 minute. */
  lockAfterMs?: number;
  /** After this many failed prompts the user must sign in with their password again. Default 3. */
  maxFailures?: number;
  now?: () => number;
}

export type UnlockResult = 'unlocked' | 'failed' | 'password-required' | 'not-enabled';

const ENABLED_KEY = 'qyou.biometric.enabled';

export class BiometricGate {
  private readonly authenticator: BiometricAuthenticator;
  private readonly storage: UnlockStorage;
  private readonly lockAfterMs: number;
  private readonly maxFailures: number;
  private readonly now: () => number;
  private failures = 0;
  private backgroundedAt: number | null = null;

  constructor(options: BiometricGateOptions) {
    this.authenticator = options.authenticator;
    this.storage = options.storage;
    this.lockAfterMs = options.lockAfterMs ?? 60_000;
    this.maxFailures = options.maxFailures ?? 3;
    this.now = options.now ?? Date.now;
  }

  /** Turning it on requires a successful biometric check, so it cannot be enabled by someone without the user's biometrics. */
  async enable(): Promise<boolean> {
    if (!(await this.authenticator.isAvailable())) return false;
    if (!(await this.authenticator.authenticate('Enable biometric unlock'))) return false;
    await this.storage.setItem(ENABLED_KEY, 'true');
    return true;
  }

  async disable(): Promise<void> {
    await this.storage.setItem(ENABLED_KEY, 'false');
  }

  async isEnabled(): Promise<boolean> {
    return (await this.storage.getItem(ENABLED_KEY)) === 'true' && (await this.authenticator.isAvailable());
  }

  onBackground(): void {
    this.backgroundedAt = this.now();
  }

  /** True when the session should be locked now (backgrounded longer than `lockAfterMs`). */
  shouldLock(): boolean {
    return this.backgroundedAt !== null && this.now() - this.backgroundedAt >= this.lockAfterMs;
  }

  async unlock(): Promise<UnlockResult> {
    if (!(await this.isEnabled())) return 'not-enabled';
    if (this.failures >= this.maxFailures) return 'password-required';
    if (await this.authenticator.authenticate('Unlock Qyou')) {
      this.failures = 0;
      this.backgroundedAt = null;
      return 'unlocked';
    }
    this.failures += 1;
    return this.failures >= this.maxFailures ? 'password-required' : 'failed';
  }

  /** Called after a successful password sign-in. */
  resetFailures(): void {
    this.failures = 0;
    this.backgroundedAt = null;
  }
}
