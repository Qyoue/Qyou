# Pre-Launch Security Review Gate & Checklist (#1028)

## Overview

Before enabling the `STELLAR_INCENTIVES_ENABLED` feature flag (#959 / Track 1 #11) in any production environment, all checklist items below must be audited, verified, and signed off by both the Security and Core Engineering teams.

---

## Pre-Launch Verification Matrix

### 1. Key Custody & Secrets Management
- [ ] No Stellar secret seeds (`S[A-Z2-7]{55}`) exist in `.env`, git history, or build artifacts.
- [ ] Distribution keys are retrieved via AWS Secrets Manager or HashiCorp Vault (`SecretsManager`).
- [ ] Log scrubbing middleware (`redactStellarSecretKeys`) is verified active across all API logging outputs.

### 2. Multi-Signature & Quorum Thresholds
- [ ] The production distribution account is configured with `medThreshold = 2` and `highThreshold = 3`.
- [ ] At least 2 independent signers are required for any reward distribution.
- [ ] Cold storage recovery key is confirmed offline and verified in air-gapped custody.

### 3. Distribution Safeguards & Anomaly Detection
- [ ] Hard per-transaction cap (`50.0000000 XLM`) is configured in `DistributionGuard`.
- [ ] 24-hour daily volume velocity cap (`1,000.0000000 XLM`) is enabled.
- [ ] Automated alerting on payouts exceeding 3x standard queue reward is wired to PagerDuty/Slack.
- [ ] Emergency distribution kill switch (#1030) is tested and operational.

### 4. Smart Contract Audit & Idempotency
- [ ] Soroban `IncentivePoolContract` passed static analysis and external review.
- [ ] Upgrade bytecode admin key is strictly segregated from the distribution signing key.
- [ ] Idempotency key deduplication verified against duplicate payout replays (#1002).

### 5. Abuse Prevention & Sybil Controls
- [ ] `WalletAbuseDetector` active on `POST /api/stellar/wallet` (rate limits + key reuse prevention).
- [ ] Wallet unlinking endpoint strictly requires re-authentication (`DELETE /api/stellar/wallet`).
- [ ] Audit logs for wallet links and unlinks are archived into immutable storage.

---

## Sign-Off Requirements

| Role | Name | Date | Status |
|:---|:---|:---:|:---:|
| Security Lead | ____________________ | ________ | PENDING |
| Infrastructure Lead | ____________________ | ________ | PENDING |
| Stellar Domain Lead | ____________________ | ________ | PENDING |
