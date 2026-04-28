# Reputation Anchoring Strategy

## Objective
Define how Qyou trust/reputation signals are committed to Stellar in a way that is verifiable, auditable, and cost-efficient at scale.

## Decision Summary
- **On-chain stores proof, not raw reputation history.**
- **Off-chain stores full report-level evidence and scoring features.**
- **Anchoring mode:** default **daily batch per shard** with optional **high-risk near-real-time anchors**.
- **Transaction structure:** `manageData` entries for machine-readable fields + optional memo hash for compact proof linking.

## Data Placement: On-Chain vs Off-Chain

### On-chain (minimal, immutable proof)
- `schema_version`
- `anchor_type` (`REPUTATION_SIGNAL`)
- `window_start_utc`
- `window_end_utc`
- `scope_id` (global or geographic shard)
- `signal_root` (Merkle root of included reputation signals)
- `record_count`
- `engine_version`
- `prev_anchor_hash` (chain continuity)

### Off-chain (query-heavy / large / private)
- User-level inputs and intermediate features
- Full signal list used to compute `signal_root`
- Per-report metadata and moderation context
- Personally identifying or sensitive location details
- Replay files and audit snapshots

Rationale: Stellar should provide tamper-evident checkpointing, while analytics and recalculation stay off-chain.

## Generic Reputation Signal Schema (off-chain canonical)

```json
{
  "schemaVersion": "1.0",
  "signalId": "uuid",
  "userId": "uuid",
  "windowStartUtc": "2026-02-21T00:00:00Z",
  "windowEndUtc": "2026-02-22T00:00:00Z",
  "trustScore": 0.0,
  "trustLevel": "LOW|MEDIUM|HIGH",
  "confidence": 0.0,
  "reportCount": 0,
  "verifiedCount": 0,
  "disputedCount": 0,
  "penaltyPoints": 0,
  "featureDigest": "sha256hex",
  "computedAtUtc": "2026-02-22T00:05:00Z",
  "engineVersion": "rep-v1"
}
```

Notes:
- `featureDigest` is a hash of full feature vector to allow deterministic audit without exposing full vector on-chain.
- `trustScore` should be bounded (example: 0-100 internally, normalized to 0-1 in schema).

## Anchor Transaction Schema (on-chain)

Use **one dedicated anchor account** (or shard accounts) with `manageData` operations:

### ManageData keys
- `qyou.rep.v`: schema version (e.g. `1`)
- `qyou.rep.t`: anchor type (`REPUTATION_SIGNAL`)
- `qyou.rep.ws`: window start epoch seconds
- `qyou.rep.we`: window end epoch seconds
- `qyou.rep.sc`: scope id/shard id
- `qyou.rep.rc`: record count
- `qyou.rep.ev`: engine version
- `qyou.rep.pr`: previous anchor tx hash
- `qyou.rep.rt`: Merkle root (`signal_root`)

### Memo usage
- Optional `MemoHash` = hash of serialized anchor manifest JSON.
- Purpose: independent compact pointer, helpful for explorers and indexing.

### Why `manageData` over memo-only
- Key/value fields are easier for indexers and deterministic parsers.
- Memo has size/type limits and is less expressive by itself.
- Combined approach gives both structured fields and compact global hash reference.

## Anchoring Frequency

### Option A: Per report (real-time)
- Best freshness for trust updates.
- Highest transaction volume and operational cost.
- Not recommended as default at scale.

### Option B: Daily batch (recommended default)
- Aggregate all signals for day + shard and anchor once.
- Major cost reduction with strong auditability.
- Small trust freshness delay (minutes to 24h depending run schedule).

### Option C: Hybrid (recommended production policy)
- Daily batch baseline.
- Additional near-real-time anchor for:
  - high-value users
  - fraud-risk spikes
  - moderation escalation events

## Cost Implications (High Volume)
Let:
- `R` = reports/day
- `S` = average signals per report pipeline output (often ~1 user-day aggregate impact)
- `B` = batches/day
- `K` = shards

### Per-report anchoring
- On-chain tx/day approximates `R` (or worse if multiple ops/report).
- Cost grows linearly with traffic; operationally expensive.

### Daily shard batch anchoring
- On-chain tx/day approximates `B * K`.
- Example: hourly batches (`B=24`) across 10 shards -> `240 tx/day`, independent of raw report volume.

### Trade-off: Real-time Trust vs Transaction Costs
- **Real-time trust:** better UX for immediate score updates, but expensive and harder to operate.
- **Batch trust:** slightly stale on-chain checkpoints, but dramatically cheaper and easier to scale.
- **Chosen strategy:** hybrid with daily/hourly batching + event-driven immediate anchors for risk cases.

## Integrity and Audit Flow
1. Compute canonical reputation signals off-chain.
2. Build Merkle tree over sorted signal list.
3. Persist full manifest and proof artifacts in DB/object storage.
4. Submit Stellar tx with `manageData` fields and optional memo hash.
5. Store tx hash back in manifest for bidirectional traceability.

## Operational Guardrails
- Deterministic sorting before Merkle construction.
- Idempotent anchor job key: `(window_start, window_end, scope_id, engine_version)`.
- Alert if anchor delay exceeds SLA.
- Reject schema-version mismatch between scoring engine and anchor writer.

## Rollout Recommendation
- Phase 1: daily batch anchoring by region shard.
- Phase 2: move to hourly batch if trust freshness needs improve.
- Phase 3: add event-driven immediate anchors for high-risk events.

## Acceptance Criteria Mapping
- A generic Reputation Signal schema is defined in **Generic Reputation Signal Schema (off-chain canonical)**.
- The trade-off between real-time trust and transaction costs is documented in **Trade-off: Real-time Trust vs Transaction Costs**.

## Batch Anchor Job Input Contract

The backend uses a standardized `BatchAnchorJobInput` contract to queue and execute reputation anchoring jobs:

```typescript
type BatchAnchorJobInput = {
  batchId: string;           // Unique identifier for this batch
  userId: string;            // User initiating or associated with batch
  reportIds: string[];       // Report IDs included in this anchor
  anchorTimestamp: number;   // Unix timestamp for anchor window
  ledgerSequence?: number;   // Stellar ledger sequence (post-anchor)
  transactionHash?: string;  // Stellar transaction hash (post-anchor)
};
```

This contract ensures clean handoff between the reputation engine and the Stellar anchoring service, maintaining deterministic references without coupling live app state to Horizon responses.


