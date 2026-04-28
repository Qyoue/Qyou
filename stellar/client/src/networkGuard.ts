import { STELLAR_CONFIG, NetworkType } from './config';

export class NetworkGuard {
  private static readonly _network: NetworkType = STELLAR_CONFIG.network;

  static isTestnet(): boolean {
    return this._network === 'TESTNET';
  }

  static isMainnet(): boolean {
    return this._network === 'MAINNET';
  }

  /** Throws if running on mainnet and the caller hasn't explicitly opted in. */
  static requireTestnet(context: string): void {
    if (this.isMainnet()) {
      throw new Error(
        `[NetworkGuard] "${context}" is only allowed on TESTNET. ` +
          `Current network: MAINNET.`,
      );
    }
  }

  /** Logs a loud warning before any mainnet write operation. */
  static warnMainnetWrite(operation: string): void {
    if (this.isMainnet()) {
      console.warn(
        `⚠️  [NetworkGuard] MAINNET write operation: "${operation}". ` +
          `Ensure this is intentional.`,
      );
    }
  }

  /** Returns a safe label for logging without leaking secrets. */
  static networkLabel(): string {
    return this.isMainnet() ? '🔴 MAINNET' : '🟢 TESTNET';
  }

  /** Asserts the active network matches the expected one. */
  static assertNetwork(expected: NetworkType): void {
    if (this._network !== expected) {
      throw new Error(
        `[NetworkGuard] Expected ${expected} but running on ${this._network}.`,
      );
    }
  }
}
