# Stellar Integration Threat Model & Security Controls

## Overview

The Qyou Stellar incentive integration manages cryptographic value transfer (XLM and incentive tokens) to reward users for verified physical and virtual queue participation. Because on-chain transactions are irreversible, this threat model assesses the attack surface, outlines threat actors, and maps each risk directly to controls implemented across the codebase.

---

## Threat Matrix & Mitigation Mapping

| Threat ID | Threat Category | Threat Description | Impact | Mitigating Control & Backlog Reference |
|:---|:---|:---|:---|:---|
| **THREAT-01** | **Key Exfiltration** | Exposure of distribution signing secret seeds via logs, environment variables, crash dumps, or repository leaks. | Critical | 1. Dedicated Secrets Manager integration (`packages/stellar/src/security/secrets-manager.ts`, #1025).<br>2. Log-scrubbing middleware & regex redaction matching `S[A-Z2-7]{55}` (#1024).<br>3. Multi-signature distribution accounts (#1026). |
| **THREAT-02** | **Double-Spend & Replay** | Replay of valid distribution transactions to extract duplicate rewards from the pool for a single queue completion. | High | 1. Idempotency keys enforced in Soroban contract `distribute` and client (`IncentivePoolContract`, #995, #1002).<br>2. Unique per-user/queue claim constraints in `RewardEligibilityService` (#1013). |
| **THREAT-03** | **Unauthorized Distribution** | Malicious actor or unauthorized service account invokes the distribution contract directly or via API. | Critical | 1. Soroban contract `require_auth` verifying designated distribution admin (#996).<br>2. API route authentication via JWT (`requireAuth`) on `/api/stellar/wallet` (#1006, #1007).<br>3. Admin caller verification in `IncentivePoolClient.distribute` (#1000). |
| **THREAT-04** | **Liquidity Draining** | Compromised admin key or logical loop drains all tokens or XLM from the incentive pool. | High | 1. Contract balance invariants preventing distributions exceeding available pool balance (#1002).<br>2. Kill switch emergency circuit breaker to halt distributions instantly (#1030).<br>3. Transaction amount limits and daily velocity bounds (#1027). |
| **THREAT-05** | **Wallet Spoofing / Phishing** | Malicious party links an unauthorized wallet address to a victim's account, or steals recovery access. | High | 1. Re-authentication requirement (password confirmation) on wallet unlinking (#1009, #973).<br>2. Conflict prevention: reject linking duplicate wallets to single user (#1007).<br>3. Security audit logging for every link/unlink event (#1009). |
| **THREAT-06** | **Denial of Service (Horizon / RPC)** | RPC degradation or rate-limiting on Horizon/Soroban RPC endpoints breaks queue completion flow. | Medium | 1. Short-TTL balance caching (`WalletService.getBalances`, #969, #1008).<br>2. Asynchronous decoupling of reward execution from user checkout flow (#1014).<br>3. Provider redundancy and failover runbook (#1068). |

---

## Defense-in-Depth Architecture

1. **Smart Contract Layer (Soroban)**
   - Hardcoded admin access control with explicit `require_auth`.
   - Separate upgrade admin key from distribution admin key.
   - Idempotency storage preventing duplicate execution of identical distribution keys.

2. **Backend API Layer (Express / TypeScript)**
   - Feature flag gating (`STELLAR_INCENTIVES_ENABLED`) prevents premature route exposure in production (#959, #1006).
   - Strict public key format validation (`^G[A-Z2-7]{55}$`) on ingress.
   - Comprehensive audit logging for all wallet state changes (`STELLAR_WALLET_LINKED`, `STELLAR_WALLET_UNLINKED`).

3. **Operational Layer**
   - Health monitoring and low-balance alerts on distribution pool (`IncentivePoolOperatorDashboard`, #1016, #1063).
   - Automated reconciliation between database reward records and on-chain Soroban events (#1001, #1065).
