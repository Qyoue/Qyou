/**
 * Slack alert notifier wired to the monitors (#1372).
 *
 * Posts to a Slack incoming-webhook URL. Delivery never throws into the
 * monitor that triggered it: failures are returned/logged so an alerting
 * outage cannot break balance checks or reconciliation.
 */
import type { BalanceAlert } from './balance-monitor.js';
import type { ReconciliationDiscrepancy, ReconciliationRunReport } from './reconciliation-job.js';

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number }>;

export interface SlackNotifierOptions {
  /** Incoming webhook URL; when empty the notifier is disabled and `notify` is a no-op. */
  readonly webhookUrl?: string;
  readonly username?: string;
  readonly fetchImpl?: FetchLike;
  readonly timeoutMs?: number;
}

export interface NotifyResult {
  readonly delivered: boolean;
  readonly skipped?: 'disabled';
  readonly error?: string;
}

const SEVERITY_EMOJI: Record<string, string> = { warning: ':warning:', critical: ':rotating_light:' };

export class SlackNotifier {
  private readonly webhookUrl: string;
  private readonly username: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: SlackNotifierOptions = {}) {
    this.webhookUrl = (options.webhookUrl ?? '').trim();
    this.username = options.username ?? 'Qyou alerts';
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    if (this.webhookUrl && !/^https:\/\/hooks\.slack\.com\//.test(this.webhookUrl)) {
      throw new Error('SLACK_WEBHOOK_URL must be an https://hooks.slack.com/ URL');
    }
  }

  static fromEnv(env: Record<string, string | undefined> = process.env): SlackNotifier {
    return new SlackNotifier({ webhookUrl: env.SLACK_WEBHOOK_URL });
  }

  get enabled(): boolean {
    return this.webhookUrl.length > 0;
  }

  public async notify(text: string): Promise<NotifyResult> {
    if (!this.enabled) return { delivered: false, skipped: 'disabled' };
    try {
      const res = await this.fetchImpl(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: this.username, text }),
      });
      if (!res.ok) return { delivered: false, error: `slack responded ${res.status}` };
      return { delivered: true };
    } catch (err) {
      return { delivered: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export function formatBalanceAlert(alert: BalanceAlert): string {
  const emoji = SEVERITY_EMOJI[alert.severity] ?? ':warning:';
  return (
    `${emoji} *Distribution balance ${alert.severity}*\n` +
    `${alert.message}\n` +
    `Account: \`${alert.accountAddress}\` — balance ${alert.currentBalanceXlm} XLM, threshold ${alert.thresholdXlm} XLM`
  );
}

export function formatDiscrepancies(
  discrepancies: readonly ReconciliationDiscrepancy[],
  report: ReconciliationRunReport
): string {
  return (
    `:rotating_light: *Reconciliation found ${discrepancies.length} discrepancy(ies)*\n` +
    `Run took ${report.durationMs} ms.`
  );
}

export interface MonitorLike {
  subscribeAlert(handler: (...args: never[]) => void | Promise<void>): () => void;
}

/** Subscribes the notifier to both monitors; returns a function that unsubscribes. */
export function wireSlackAlerts(
  notifier: SlackNotifier,
  monitors: {
    balanceMonitor?: { subscribeAlert(h: (a: BalanceAlert) => void | Promise<void>): () => void };
    reconciliationJob?: {
      subscribeAlert(
        h: (d: readonly ReconciliationDiscrepancy[], r: ReconciliationRunReport) => void | Promise<void>
      ): () => void;
    };
  }
): () => void {
  const unsubscribers: Array<() => void> = [];
  if (monitors.balanceMonitor) {
    unsubscribers.push(
      monitors.balanceMonitor.subscribeAlert(async (alert) => {
        await notifier.notify(formatBalanceAlert(alert));
      })
    );
  }
  if (monitors.reconciliationJob) {
    unsubscribers.push(
      monitors.reconciliationJob.subscribeAlert(async (discrepancies, report) => {
        await notifier.notify(formatDiscrepancies(discrepancies, report));
      })
    );
  }
  return () => unsubscribers.forEach((fn) => fn());
}
