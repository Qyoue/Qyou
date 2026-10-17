export interface ConfirmedRewardNotification {
  rewardId: string;
  amount: string;
  asset: string;
  transactionHash?: string;
  timestamp: number;
}

export type ToastCallback = (message: string, type: 'success' | 'error') => void;

export class WebRewardNotificationManager {
  private static _instance: WebRewardNotificationManager | null = null;
  private _toastCallback: ToastCallback | null = null;

  public static getInstance(): WebRewardNotificationManager {
    if (!this._instance) {
      this._instance = new WebRewardNotificationManager();
    }
    return this._instance;
  }

  public registerToastHandler(handler: ToastCallback): () => void {
    this._toastCallback = handler;
    return () => {
      if (this._toastCallback === handler) {
        this._toastCallback = null;
      }
    };
  }

  /**
   * Handles a reward status transition to confirmed.
   * Emits toast notification and browser native notification if permitted.
   */
  public onRewardConfirmed(reward: ConfirmedRewardNotification): void {
    const message = `🎉 Stellar Reward Confirmed: +${reward.amount} ${reward.asset} credited to your wallet!`;

    // 1. In-app toast notification
    if (this._toastCallback) {
      this._toastCallback(message, 'success');
    }

    // 2. Native browser Notification API if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Qyou Queue Reward', {
          body: `You received ${reward.amount} ${reward.asset} on Stellar for completing your queue wait!`,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }
  }
}
