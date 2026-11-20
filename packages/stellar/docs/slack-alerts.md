# Slack alerts

`SlackNotifier` (`src/monitoring/slack-notifier.ts`) posts to a Slack incoming webhook.

- Set `SLACK_WEBHOOK_URL` (an `https://hooks.slack.com/...` URL). When unset the notifier is disabled and
  every call is a no-op; any other host is rejected at construction.
- `wireSlackAlerts(notifier, { balanceMonitor, reconciliationJob })` subscribes to both monitors:
  a distribution-balance warning or critical alert, and a reconciliation run that finds discrepancies.
- Delivery failures (non-2xx or network error) are returned from `notify()` and never thrown into the monitor.
- `sendAlertNotification('slack', msg)` in `alertChannels.ts` uses the same notifier; the `email` channel is not implemented.
