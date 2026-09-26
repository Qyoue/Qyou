export enum StellarAnalyticsEventType {
  WALLET_CONNECT_ATTEMPT = 'stellar_wallet_connect_attempt',
  WALLET_CONNECTED = 'stellar_wallet_connected',
  WALLET_DISCONNECTED = 'stellar_wallet_disconnected',
  REWARD_ELIGIBILITY_CHECKED = 'stellar_reward_eligibility_checked',
  REWARD_PAYOUT_TRIGGERED = 'stellar_reward_payout_triggered',
  REWARD_CONFIRMED = 'stellar_reward_confirmed',
  REWARD_FAILED = 'stellar_reward_failed',
}

export interface StellarAnalyticsPayload {
  readonly eventType: StellarAnalyticsEventType;
  readonly userId?: string;
  readonly publicKey?: string;
  readonly queueId?: string;
  readonly amount?: string;
  readonly asset?: string;
  readonly transactionHash?: string;
  readonly error?: string;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: number;
}

export type StellarAnalyticsListener = (event: StellarAnalyticsPayload) => void;

export class StellarAnalyticsTracker {
  private static _instance: StellarAnalyticsTracker | null = null;
  private readonly _listeners = new Set<StellarAnalyticsListener>();
  private readonly _eventBuffer: StellarAnalyticsPayload[] = [];
  private readonly _maxBuffer = 500;

  public static getInstance(): StellarAnalyticsTracker {
    if (!this._instance) {
      this._instance = new StellarAnalyticsTracker();
    }
    return this._instance;
  }

  public track(event: Omit<StellarAnalyticsPayload, 'timestamp'>): StellarAnalyticsPayload {
    const fullPayload: StellarAnalyticsPayload = {
      ...event,
      timestamp: Date.now(),
    };

    this._eventBuffer.push(fullPayload);
    if (this._eventBuffer.length > this._maxBuffer) {
      this._eventBuffer.shift();
    }

    for (const listener of this._listeners) {
      try {
        listener(fullPayload);
      } catch (err) {
        console.warn('[StellarAnalyticsTracker] Listener error:', err);
      }
    }

    return fullPayload;
  }

  public subscribe(listener: StellarAnalyticsListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  public getRecentEvents(limit = 50): StellarAnalyticsPayload[] {
    return this._eventBuffer.slice(-limit);
  }

  public clear(): void {
    this._eventBuffer.length = 0;
    this._listeners.clear();
  }
}
