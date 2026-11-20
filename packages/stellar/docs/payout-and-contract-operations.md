# Payout preflight, channel accounts, TTL and contract controls

## Preflight (`transactions/payout-preflight.ts`)
`preflightPayout` / `assertPayoutPreflight` check, before a payout is built: the recipient exists, holds at least
its minimum balance (`(2 + subentries) * 0.5` XLM) and, for a non-native asset, has an authorised trustline with
room under its limit. Pass `IncentiveServiceOptions.payoutPreflight` to run it before every reward; failures are
typed (`PayoutPreflightError.issues[].code`: `ACCOUNT_NOT_FOUND`, `ACCOUNT_NOT_FUNDED`, `NO_TRUSTLINE`,
`TRUSTLINE_NOT_AUTHORIZED`, `TRUSTLINE_LIMIT_EXCEEDED`). Supply an `AccountLoader` backed by Horizon.

## Concurrent payouts (`transactions/payout-submitter.ts`)
`PayoutSubmitter` runs each payout from its own channel account with a per-account `SequenceManager`, so parallel
payouts never share a sequence number; a `tx_bad_seq` reloads the sequence once. `health()` lists channel
accounts below the reserve. Fund channel accounts and register them as signers of the distribution account.

## TTL extension (`monitoring/ttl-extension-job.ts` and `extend_instance_ttl`)
The contract exposes `extend_instance_ttl(threshold, extend_to)` (anyone may call it; it only extends).
`TtlExtensionJob` checks the remaining ledgers every 6 hours and extends below 17,280 ledgers (about 1 day) up to
518,400 (about 30 days). Inject `getRemainingLedgers` (RPC ledger entry TTL) and `extend` (an invoke transaction).

## Contract controls
- `pause` / `unpause` (admin): `distribute` fails with `Paused (6)`; deposits and reads still work.
- `set_max_per_call(amount)` (admin, 0 = no cap): larger `distribute` calls fail with `CapExceeded (7)`.
- Admin handover is two-step: `propose_admin(new)` then `accept_admin(new)` signed by the new admin
  (`NoPendingAdmin (8)` when nothing is pending); `cancel_admin_proposal` withdraws it.
