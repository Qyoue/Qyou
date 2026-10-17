# Staging Environment Guide: Stellar Testnet Pre-Production Validation

**Target Audience**: DevOps, Backend Engineers, QA Engineers  
**Related Issue**: #1071  

---

## 1. Overview & Objective

To bridge the gap between local sandbox testing and production mainnet launch, Qyou maintains a dedicated **Staging Environment** fully wired to the **Stellar Testnet** (`Test SDF Network ; September 2015`).

This staging deployment allows:
- End-to-end integration testing of `@qyou/api` and `@qyou/web` against live Stellar Horizon and Soroban nodes.
- Validating real wallet linking, account balance caching, and Soroban incentive pool contract interactions with live block times (~5 seconds).
- Verifying automated post-deployment smoke tests (#1072) prior to production rollouts.

---

## 2. Infrastructure Architecture & Network Configuration

```text
┌───────────────────────┐         ┌───────────────────────┐
│ @qyou/web (Staging)   │ ──────> │ @qyou/api (Staging)   │
│ Port: 3000            │         │ Port: 4000            │
└───────────────────────┘         └───────────┬───────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
     ┌───────────────────────────────────┐           ┌──────────────────────────────────┐
     │ Stellar Horizon (Testnet)         │           │ Soroban RPC (Testnet)            │
     │ https://horizon-testnet.stellar.org│          │ https://soroban-testnet.stellar.org│
     └───────────────────────────────────┘           └──────────────────────────────────┘
```

### Staging Environment Variables

| Variable | Staging Value | Description |
| :--- | :--- | :--- |
| `ENABLE_STELLAR_INTEGRATION` | `"true"` | Enables `/api/stellar/*` and `/api/v1/stellar/*` routes |
| `STELLAR_NETWORK` | `"TESTNET"` | Targets SDF Testnet; enforced by `NetworkGuard` |
| `STELLAR_NETWORK_PASSPHRASE` | `"Test SDF Network ; September 2015"` | Stellar testnet network passphrase |
| `STELLAR_HORIZON_URL` | `"https://horizon-testnet.stellar.org"` | Upstream testnet Horizon endpoint |
| `STELLAR_SOROBAN_RPC_URL` | `"https://soroban-testnet.stellar.org"` | Upstream testnet Soroban RPC endpoint |
| `STELLAR_DISTRIBUTION_PUBLIC_KEY` | `G...` (56 chars) | Public key of staging pool distribution account |
| `STELLAR_DISTRIBUTION_SECRET_KEY` | `S...` (KMS secret) | Signing key loaded securely via CI/CD secrets |
| `STELLAR_INCENTIVE_POOL_CONTRACT_ID`| `C...` (56 chars) | Deployed testnet Soroban IncentivePool contract |

---

## 3. Standing Up Staging Locally or in Cloud

### Step 3.1: Fund Staging Testnet Account via Friendbot
Ensure the staging distribution account is funded on testnet:
```bash
curl -X POST "https://friendbot.stellar.org?addr=$STELLAR_DISTRIBUTION_PUBLIC_KEY"
```

### Step 3.2: Deploy Staging Soroban Contract
If deploying a fresh testnet contract:
```bash
npm run deploy:testnet -w @qyou/stellar
```
Copy the emitted contract address into `STELLAR_INCENTIVE_POOL_CONTRACT_ID`.

### Step 3.3: Launch Staging Services with Docker Compose
```bash
# Export runtime secrets (or load from vault)
export STELLAR_DISTRIBUTION_SECRET_KEY="<secret_key>"
export STELLAR_DISTRIBUTION_PUBLIC_KEY="<public_key>"
export STELLAR_INCENTIVE_POOL_CONTRACT_ID="<contract_id>"

docker compose -f docker-compose.staging.yml up -d
```

### Step 3.4: Run Post-Deployment Smoke Tests (#1072)
Immediately after deployment, execute the automated smoke test suite:
```bash
npm run smoke-test -w @qyou/stellar
```
Confirm all 4 health assertions report `[PASS]`.
