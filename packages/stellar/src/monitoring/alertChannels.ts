import { SlackNotifier } from './slack-notifier.js';

/** Sends an alert through the named channel. Email is not implemented and is ignored. */
export async function sendAlertNotification(
  channel: 'slack' | 'email',
  msg: string,
  notifier: SlackNotifier = SlackNotifier.fromEnv()
): Promise<void> {
  if (channel === 'slack') {
    await notifier.notify(msg);
  }
}
