/**
 * Wallet Linking Abuse & Account Farming Detection (#1029)
 *
 * Detects sybil attacks, multi-account farming, and rapid wallet-linking recycling
 * intended to exploit queue reward eligibility.
 */

export interface AbuseDetectorOptions {
  readonly maxLinksPerHourPerUser?: number;
  readonly maxLinksPerHourPerIp?: number;
}

export interface AbuseCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly isFlagged: boolean;
}

export class WalletAbuseDetector {
  private readonly _maxLinksPerUser: number;
  private readonly _maxLinksPerIp: number;
  private readonly _userLinkHistory = new Map<string, number[]>();
  private readonly _ipLinkHistory = new Map<string, number[]>();
  private readonly _keyToUsers = new Map<string, Set<string>>();

  constructor(options: AbuseDetectorOptions = {}) {
    this._maxLinksPerUser = options.maxLinksPerHourPerUser ?? 3;
    this._maxLinksPerIp = options.maxLinksPerHourPerIp ?? 10;
  }

  private filterRecent(timestamps: number[], windowMs = 3600_000): number[] {
    const cutoff = Date.now() - windowMs;
    return timestamps.filter((t) => t > cutoff);
  }

  /**
   * Evaluates whether a proposed wallet linking operation is flagged as abusive.
   */
  public evaluate(params: {
    userId: string;
    publicKey: string;
    clientIp?: string;
  }): AbuseCheckResult {
    const { userId, publicKey, clientIp } = params;

    // 1. Multi-account public key reuse detection (farming check)
    const existingUsers = this._keyToUsers.get(publicKey);
    if (existingUsers && existingUsers.size > 0 && !existingUsers.has(userId)) {
      return {
        allowed: false,
        reason: 'This Stellar public key has already been registered by a different account (anti-farming policy).',
        isFlagged: true,
      };
    }

    // 2. User velocity limit check
    const userTimestamps = this.filterRecent(this._userLinkHistory.get(userId) || []);
    if (userTimestamps.length >= this._maxLinksPerUser) {
      return {
        allowed: false,
        reason: `Exceeded hourly wallet-linking frequency limit (${this._maxLinksPerUser}/hour).`,
        isFlagged: true,
      };
    }

    // 3. IP velocity check (if IP provided)
    if (clientIp) {
      const ipTimestamps = this.filterRecent(this._ipLinkHistory.get(clientIp) || []);
      if (ipTimestamps.length >= this._maxLinksPerIp) {
        return {
          allowed: false,
          reason: `Too many wallet linking requests from this network address (${this._maxLinksPerIp}/hour).`,
          isFlagged: true,
        };
      }
    }

    return {
      allowed: true,
      isFlagged: false,
    };
  }

  /**
   * Records a confirmed wallet-link event into abuse tracking history.
   */
  public recordLink(userId: string, publicKey: string, clientIp?: string): void {
    const now = Date.now();

    // Record user history
    const userTs = this.filterRecent(this._userLinkHistory.get(userId) || []);
    userTs.push(now);
    this._userLinkHistory.set(userId, userTs);

    // Record IP history
    if (clientIp) {
      const ipTs = this.filterRecent(this._ipLinkHistory.get(clientIp) || []);
      ipTs.push(now);
      this._ipLinkHistory.set(clientIp, ipTs);
    }

    // Record key ownership
    const users = this._keyToUsers.get(publicKey) || new Set<string>();
    users.add(userId);
    this._keyToUsers.set(publicKey, users);
  }

  public reset(): void {
    this._userLinkHistory.clear();
    this._ipLinkHistory.clear();
    this._keyToUsers.clear();
  }
}
