# Stellar Integration Capacity Planning & SDK Client Sizing

**Author**: Qyou Blockchain Engineering & Platform Team  
**Scope**: `@qyou/stellar`, Soroban RPC, Horizon API, Database Worker Scaling  
**Related Issues**: #5, #6, #1067  

---

## 1. Executive Summary & Objective

This document models the transaction throughput requirements, network fee budgets, and SDK client configuration profiles required to support Qyou's queue reward distribution at scale. It defines volume assumptions for baseline, peak rush-hour, and flash queue events, providing explicit architectural requirements to avoid sequence-number contention and RPC exhaustion.

---

## 2. Expected Volume & Throughput Assumptions

| Metric | Baseline (Normal) | Daily Peak (Rush Hour) | High-Stress Flash Drop |
| :--- | :--- | :--- | :--- |
| **Active Queues** | 20 | 100 | 250 |
| **Hourly Queue Completions** | 300 | 3,600 | 18,000 |
| **Reward Transactions / Sec (TPS)** | ~0.1 TPS | 1.0 - 2.5 TPS | 25.0 - 50.0 TPS |
| **Max Concurrent Payout Requests** | 5 | 25 | 100+ |
| **Daily Reward Payouts** | ~5,000 | ~35,000 | ~150,000 |

### Workload Characteristics
- **Transaction Type**: Invocation of Soroban `IncentivePoolContract.distribute` or native XLM payment operations.
- **Payload Size**: ~1.2 KB per signed Soroban transaction envelope (XDR).
- **Latency Target**: 95% of confirmed payouts under 6.0 seconds (within 1-2 ledger closes).

---

## 3. Stellar Blockchain Constraints & Sizing

### 3.1 Ledger Cadence & Throughput Limits
- **Ledger Close Time**: Stellar ledgers close every ~5.0 seconds.
- **Maximum Operations per Ledger**: Mainnet protocol limit is configured at 1,000 operations per ledger (~200 ops/second globally). Qyou peak traffic (50 TPS) will occupy up to 25% of ledger capacity, requiring dynamic fee bidding.

### 3.2 Sequence Number Contention & Channel Accounts
On Stellar, a single account can only submit **one transaction per sequence number** sequentially. Submitting concurrent transactions with the same source account causes `tx_bad_seq` failures.

**Required Architectural Pattern: Channel Accounts Pool**
- To achieve 50 concurrent transactions per ledger close, Qyou must maintain a pool of **20 to 50 lightweight Channel Accounts**.
- The Channel Account signs as the `source_account` (consuming its sequence number), while the primary Distribution Pool signs as the fee payer and fund authorization.
- Channel accounts are funded with minimal reserve: `1.5 XLM` each.

### 3.3 Fee Budgeting & Surge Pricing
- **Base Fee**: 100 stroops (0.00001 XLM).
- **Surge Pricing Buffer**: During high network congestion, the fee must dynamically increase.
- **Maximum Base Fee Allocation**: `10,000 stroops` (0.001 XLM) per operation.
- **Daily Fee Projections**:
  - Baseline (5,000 tx/day): 0.50 XLM / day ($0.06 / day).
  - Peak (35,000 tx/day): 3.50 XLM / day ($0.42 / day).
  - Surge worst-case (150,000 tx at max fee): 150 XLM / day ($18.00 / day).

---

## 4. SDK Client & Infrastructure Configuration

Based on the volume projections, the default `@qyou/stellar` client configuration (#5/#6) is sized as follows:

### 4.1 HTTP & RPC Connection Pool
```typescript
export const DEFAULT_STELLAR_CLIENT_CONFIG = {
  // Horizon & Soroban RPC endpoint timeouts
  timeoutMs: 15_000,

  // Keep-alive connection pooling
  httpAgentOptions: {
    keepAlive: true,
    keepAliveMsecs: 10_000,
    maxSockets: 64,
    maxFreeSockets: 16,
    timeout: 30_000,
  },

  // In-memory balance caching to avoid RPC spamming from user profile reads
  cacheTtlMs: 30_000,

  // Concurrency bounds for distribution worker
  maxConcurrentDistributions: 25,
};
```

### 4.2 Retry Policy & Exponential Backoff
Transient network failures (Horizon HTTP 504, Soroban RPC connection resets) must be handled with bounded exponential backoff:
- **Maximum Attempts**: 3
- **Initial Delay**: 500 ms
- **Backoff Factor**: 2.0 with ±20% randomized jitter
- **Max Delay Cap**: 5,000 ms
- **Retryable Error Codes**: HTTP 429, HTTP 502, HTTP 503, HTTP 504, `tx_insufficient_fee` (with fee bump).

---

## 5. Summary Action Items

1. **Implement Channel Account Signer Manager**: Provision pool of 20 channel accounts prior to launching queues with >5,000 daily participants.
2. **Dynamic Fee Escalation**: Integrate Horizon `/fee_stats` to adjust `max_fee` bids automatically during network surge conditions.
3. **Dedicated RPC Infrastructure**: Migrate from public SDF endpoints to dedicated third-party RPC endpoints with an established SLA (see `docs/stellar-rpc-provider-evaluation.md`).
