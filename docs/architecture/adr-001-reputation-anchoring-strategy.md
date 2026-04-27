# ADR-001: Reputation Anchoring Strategy

## Status

Accepted

## Date

2026-04-01

## Context

Qyou needs to commit trust/reputation signals to Stellar in a way that is verifiable,
auditable, and cost-efficient at scale. The full design is documented in
`docs/architecture/reputation-anchoring.md`.

Key constraints:
- Stellar transaction costs must scale sub-linearly with report volume.
- Raw reputation data (user-level features, scores) must not be stored on-chain.
- Anchors must be independently verifiable without access to off-chain data.

## Decision

- **On-chain stores proof, not raw reputation history.**
- **Off-chain stores full report-level evidence and scoring features.**
- **Anchoring mode:** daily batch per geographic shard (default), with optional
  near-real-time anchors for high-risk events.
- **Transaction structure:** `manageData` entries for machine-readable fields +
  optional `MemoHash` for compact proof linking.
- **Proof hash:** SHA-256 of a canonical JSON serialization of the anchor manifest
  (see `stellar/client/src/anchorProof.ts`).

## Consequences

**Positive:**
- Transaction volume is bounded by `batches/day × shards`, not by raw report count.
- On-chain data is minimal and tamper-evident.
- Off-chain data can be queried, replayed, and audited independently.

**Negative:**
- Trust freshness is delayed by up to 24 hours for batch anchors.
- Requires a separate batch job infrastructure.
- Proof verification requires access to the off-chain manifest.

## Supersedes

None.
