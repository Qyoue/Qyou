import { MainnetNotAllowedError } from '../errors/stellar-error.js';

export type NetworkType = 'TESTNET' | 'MAINNET' | 'FUTURENET' | 'STANDALONE';

export interface NetworkGuardOptions {
  network?: NetworkType;
  allowMainnet?: boolean;
}

/**
 * Network configuration guard rail (#1049).
 *
 * Prevents accidental execution of test/development/simulation logic on
 * the Stellar Public Mainnet unless explicitly authorized with the
 * explicit opt-in flag (options.allowMainnet or STELLAR_ALLOW_MAINNET="true").
 */
export class NetworkGuard {
  private static _defaultNetwork: NetworkType = 'TESTNET';

  public static setDefaultNetwork(network: NetworkType): void {
    this._defaultNetwork = network;
  }

  public static getActiveNetwork(): NetworkType {
    const envNetwork = (process.env.STELLAR_NETWORK || '').toUpperCase();
    if (envNetwork === 'MAINNET' || envNetwork === 'PUBLIC') return 'MAINNET';
    if (envNetwork === 'FUTURENET') return 'FUTURENET';
    if (envNetwork === 'STANDALONE') return 'STANDALONE';
    if (envNetwork === 'TESTNET') return 'TESTNET';
    return this._defaultNetwork;
  }

  public static isTestnet(network?: NetworkType): boolean {
    const net = network || this.getActiveNetwork();
    return net === 'TESTNET' || net === 'FUTURENET' || net === 'STANDALONE';
  }

  public static isMainnet(network?: NetworkType): boolean {
    const net = network || this.getActiveNetwork();
    return net === 'MAINNET';
  }

  /**
   * Throws MainnetNotAllowedError if running on mainnet and the caller has not
   * explicitly opted in via options.allowMainnet or process.env.STELLAR_ALLOW_MAINNET === 'true'.
   * (#1049)
   */
  public static requireTestnet(context: string, options: NetworkGuardOptions = {}): void {
    const network = options.network || this.getActiveNetwork();
    const explicitOptIn =
      options.allowMainnet === true || process.env.STELLAR_ALLOW_MAINNET === 'true';

    if (network === 'MAINNET' && !explicitOptIn) {
      throw new MainnetNotAllowedError(
        `[NetworkGuard] "${context}" is blocked on MAINNET without explicit opt-in confirmation (#1049). Current network: MAINNET.`,
      );
    }
  }

  /**
   * Asserts the active network matches the expected network, checking opt-in if expected is MAINNET.
   */
  public static assertNetwork(expected: NetworkType, options: NetworkGuardOptions = {}): void {
    const actual = options.network || this.getActiveNetwork();
    if (actual !== expected) {
      throw new Error(`[NetworkGuard] Expected network ${expected} but running on ${actual}.`);
    }
    if (expected === 'MAINNET') {
      this.requireTestnet(`assertNetwork(${expected})`, options);
    }
  }

  /**
   * Logs a high-visibility warning before any mainnet write operation.
   */
  public static warnMainnetWrite(operation: string, network?: NetworkType): void {
    if (this.isMainnet(network)) {
      console.warn(
        `⚠️  [NetworkGuard] MAINNET write operation: "${operation}". Ensure this is intentional with multi-party sign-off.`,
      );
    }
  }

  /**
   * Returns a safe label for logging without leaking credentials.
   */
  public static networkLabel(network?: NetworkType): string {
    return this.isMainnet(network) ? '🔴 MAINNET' : '🟢 TESTNET';
  }
}
