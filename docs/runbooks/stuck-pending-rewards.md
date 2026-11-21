# On-Call Runbook: Stuck "Pending" Rewards Incident

**Severity**: P2 (Elevated latency / Delayed customer payouts) or P1 (Complete payout halt)  
**Primary Systems**: `@qyou/stellar`, `IncentiveService`, Horizon RPC, Soroban RPC, PostgreSQL `rewards` table  
**Target Audience**: On-call Engineers, Backend SREs, Blockchain Platform Engineers  

---

## 1. Overview & Incident Symptoms

This runbook guides on-call engineers when reward records remain in a `pending` state for more than 2 minutes without transitioning to `confirmed` or `failed`.

### Common Triggers & Alerts
- Prometheus alert: `stellar_distribution_confirmation_latency_ms{quantile="0.95"} > 30000`
- Balance Alert: `CRITICAL: Distribution account balance dropped below threshold`
- Database alert: `SELECT count(*) FROM rewards WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes'` > 5
- User complaints: Queue participants completing queues without receiving on-chain XLM or reward tokens.

---

## 2. Step-by-Step Diagnostic Procedures

Follow this sequential checklist to pinpoint the exact failure domain.

### Step 2.1: Check Upstream Stellar Network & RPC Health (#1064)
Verify whether failures are network-wide or internal to Qyou:

1. Open the internal diagnostics dashboard at `/admin/stellar-health` or inspect the `NetworkHealthTracker` metrics:
   ```bash
   # Query Horizon network status & fee statistics
   curl -s -i "https://horizon-testnet.stellar.org/fee_stats"
   # Query Soroban RPC health
   curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' "https://soroban-testnet.stellar.org"
   ```
2. **Analysis**:
   - If Horizon returns HTTP 502/503/504 or latency > 4000ms: Upstream network outage.
   - If `soroban-testnet` returns `"status": "unhealthy"`: Upstream Soroban node degradation.
   - If RPC returns HTTP 429: Rate-limit exhaustion on public endpoints.

### Step 2.2: Check Distribution Account Balance & Subentry Reserves (#1063)
A distribution account with insufficient available balance (below base reserve + fee pool) will reject all outbound transactions:

1. Query distribution account details:
   ```bash
   curl -s "https://horizon-testnet.stellar.org/accounts/$STELLAR_DISTRIBUTION_PUBLIC_KEY" | jq '{balances: .balances, subentry_count: .subentry_count}'
   ```
2. **Analysis**:
   - Minimum Reserve Formula: `(2 + subentry_count) * 0.5 XLM`.
   - Available Spendable Balance: `Total XLM - Minimum Reserve`.
   - If spendable balance < 10 XLM: The account cannot pay transaction fees or token distributions.

### Step 2.3: Check Distribution Account Sequence Number Lock
Stellar requires sequential account sequence numbers (`source_account.sequence`). If a transaction with sequence `N` timed out or is stuck in the mempool, subsequent transactions with sequence `N+1` will be rejected (`tx_bad_seq`):

1. Check current on-chain sequence number:
   ```bash
   ON_CHAIN_SEQ=$(curl -s "https://horizon-testnet.stellar.org/accounts/$STELLAR_DISTRIBUTION_PUBLIC_KEY" | jq -r '.sequence')
   echo "On-chain Sequence: $ON_CHAIN_SEQ"
   ```
2. Compare with internal memory/in-flight cache sequence. If a gap exists, mempool queueing is blocked.

### Step 2.4: Check Emergency Kill Switch Status (#1030)
Verify if the circuit breaker or account transaction watcher automatically halted payouts:

1. Check kill switch status:
   ```bash
   # Inspect log lines for emergency halt messages
   grep "DistributionKillSwitch" /var/log/qyou/api.log | tail -n 20
   ```
2. If `DistributionKillSwitch.getInstance().isHalted() === true`, an automated guardrail tripped (e.g. daily velocity cap reached, unauthorized transaction detected).

### Step 2.5: Inspect In-Flight Failure & Retry Queue (#1039)
Check retry attempts and error messages attached to stuck reward records:
```sql
SELECT id, user_id, queue_id, amount, status, error, created_at 
FROM rewards 
WHERE status = 'pending' 
ORDER BY created_at ASC 
LIMIT 20;
```

---

## 3. Remediation & Incident Resolution

### Action A: Upstream RPC Outage / Failover
If the primary Horizon or Soroban RPC endpoint is failing:
1. Switch to secondary RPC provider by updating environment variables:
   ```bash
   export STELLAR_HORIZON_URL="https://horizon-testnet-backup.stellar.org"
   export STELLAR_SOROBAN_RPC_URL="https://soroban-testnet-backup.stellar.org"
   ```
2. Restart the API worker cluster to reload connections.

### Action B: Low Balance Refill
If spendable balance is depleted:
1. On Testnet:
   ```bash
   curl "https://friendbot.stellar.org?addr=$STELLAR_DISTRIBUTION_PUBLIC_KEY"
   ```
2. On Staging / Production:
   - Request operational treasury transfer of 500 XLM into the distribution account.
   - Verify balance using `DistributionBalanceMonitor.getInstance().checkBalance()`.

### Action C: Clearing Sequence Number Desync
If sequence numbers desynchronized:
1. Submit a zero-op or BumpSequence transaction to force the on-chain sequence forward to match the desired state:
   ```bash
   npm run stellar:bump-sequence -- --account $STELLAR_DISTRIBUTION_PUBLIC_KEY
   ```
2. Reset worker in-memory sequence caches.

### Action D: Replaying Stuck Rewards (#1039)
Once connectivity and funding are restored, safely trigger retries for failed/pending rewards:
```bash
# Execute batch retry script
npm run retry:pending-rewards -w @qyou/stellar
```
Or programmatically via `IncentiveService`:
```typescript
await incentiveService.retryReward(rewardId);
```
Idempotency keys ensure no reward will be double-minted.

### Action E: Resetting the Kill Switch
If the kill switch was tripped due to a false positive or after security investigation:
```typescript
DistributionKillSwitch.getInstance().reset(adminOperatorKey);
```

---

## 4. Verification & Post-Incident Audit

1. **Verify Queue Processing**:
   Monitor pending reward count:
   ```sql
   SELECT count(*) FROM rewards WHERE status = 'pending';
   ```
   Must decrease to 0.
2. **Run Ledger Reconciliation Job (#1065)**:
   Execute the automated payment-layer reconciliation job to confirm exact 1:1 match between DB records and on-chain ledger transactions:
   ```bash
   npm run stellar:reconcile -w @qyou/stellar
   ```
   Confirm report status is `clean`.
3. **Log Post-Mortem**:
   Document root cause, duration of outage, total delayed rewards, and update alert thresholds if required.
