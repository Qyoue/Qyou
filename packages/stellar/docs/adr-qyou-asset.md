# ADR: the QYOU asset, issuer, distributor, limits and flags (#1127)

Status: proposed. Covers the decision record for #1127 and the design for #1128-#1130
(implemented in `packages/stellar/src/transactions/sequence-and-fees.ts`).

## Decision

| Topic | Decision | Reason |
| --- | --- | --- |
| Issuer | A dedicated issuing account that never signs routine payments; its master key is weighted to zero after setup and control moves to a multisig (see `multisig-policy.md`) | Limits blast radius of a hot-key compromise |
| Distributor | A separate funded account holding the circulating supply and paying rewards | Issuer stays cold; rewards are ordinary payments |
| Supply cap | Fixed at issuance: mint the full cap to the distributor once, then lock the issuer (set master weight 0). Exact cap is a product decision and must be filled in before mainnet | Makes the cap verifiable on-chain |
| `AUTH_REQUIRED` | **Off** initially | Users must be able to add a trustline without issuer approval; revisit if abuse requires allowlisting |
| `AUTH_REVOCABLE` | **On** | Lets the issuer freeze balances of compromised or abusive accounts |
| `AUTH_CLAWBACK_ENABLED` | **Off** | Clawback is invasive for a reward token and must be set at issuance (cannot be added later); enabling it needs an explicit policy decision |
| `AUTH_IMMUTABLE` | Off until flags are final | Flags cannot change after it is set |

## Testnet setup (to be scripted)

The required setup script is not included. The steps it must perform: create and fund issuer and
distributor via Friendbot; set issuer flags (`AUTH_REVOCABLE`); distributor `changeTrust` to
QYOU; issuer pays the full cap to the distributor; (mainnet only) set issuer master weight to 0.

## Throughput design (#1128-#1130)

- **Sequence numbers (#1128):** all payouts from one source go through `SequenceManager`, which
  serialises submissions and reloads the sequence after a `tx_bad_seq`.
- **Channel accounts (#1129):** `ChannelAccountPool` hands out one funded channel account per
  in-flight transaction; the distributor signs the operation and fee-bumps. Pool health is
  `pool.health()` (free/total, and accounts below the reserve).
- **Fee bump (#1130):** `buildFeeBump` wraps a stuck transaction with a higher base fee, capped by
  a configurable ceiling; the fee actually paid is read from the confirmed result and recorded in
  `TransactionFeeTracker` (see `fee-reconcile.ts`).

The 50-concurrent-payouts Quickstart test required by #1128 was not written or run.
