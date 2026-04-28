/**
 * Structured logger for Stellar operations.
 * Emits JSON log lines so backend integrations can parse and trace blockchain events.
 */

type LogLevel = 'info' | 'warn' | 'error';

export interface StellarLogEntry {
  ts: string;
  level: LogLevel;
  op: string;
  data?: Record<string, unknown>;
  error?: string;
}

function emit(level: LogLevel, op: string, data?: Record<string, unknown>, error?: string) {
  const entry: StellarLogEntry = {
    ts: new Date().toISOString(),
    level,
    op,
    ...(data && { data }),
    ...(error && { error }),
  };
  const out = level === 'error' ? console.error : console.log;
  out(JSON.stringify(entry));
}

export const stellarLog = {
  info: (op: string, data?: Record<string, unknown>) => emit('info', op, data),
  warn: (op: string, data?: Record<string, unknown>) => emit('warn', op, data),
  error: (op: string, error: string, data?: Record<string, unknown>) =>
    emit('error', op, data, error),

  txSubmitted: (hash: string, sender: string, amount: string) =>
    emit('info', 'tx.submitted', { hash, sender: sender.slice(0, 8), amount }),

  txFailed: (error: string, sender: string) =>
    emit('error', 'tx.failed', { sender: sender.slice(0, 8) }, error),

  walletLoaded: (publicKey: string) =>
    emit('info', 'wallet.loaded', { publicKey: publicKey.slice(0, 8) }),

  rewardClaimed: (recipient: string, amount: string) =>
    emit('info', 'reward.claimed', { recipient: recipient.slice(0, 8), amount }),
};
