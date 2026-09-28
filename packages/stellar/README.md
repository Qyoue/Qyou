# @qyou/stellar

`@qyou/stellar` is the official Stellar blockchain and Soroban smart contract integration package for the Qyou platform. It encapsulates non-custodial and custodial wallet operations, automated queue incentive reward settlement, smart contract client invocation, and enterprise-grade security controls.

For detailed architecture diagrams and system workflows, see the [Stellar Architecture Overview](../../docs/stellar-architecture.md) and the [Stellar Glossary](../../docs/stellar-glossary.md).

---

## Architecture & Modules

The package provides modular services organized into logical sub-domains:

```
packages/stellar/
├── contracts/          # Rust Soroban smart contract (IncentivePool) and TypeScript client
├── src/
│   ├── analytics/      # Stellar distribution metrics, event counts, volume aggregation
│   ├── contracts/      # IncentivePoolClient and Soroban simulator
│   ├── eligibility/    # Reward eligibility engine and claim limits
│   ├── errors/         # Typed Stellar and Soroban domain errors
│   ├── events/         # Event parser, reward notifier, and ledger reconciliation
│   ├── security/       # Multi-sig, velocity caps, kill switch, watcher, abuse detector, network guard
│   ├── services/       # High-level WalletService and IncentiveService
│   └── types/          # Core interfaces, DTOs, and contract configurations
└── tests/              # Comprehensive unit, integration, chaos, load, and mutation tests
```

---

## Core Services

### 1. `IncentiveService`
Orchestrates participant reward payouts upon queue completion:
- Manages per-queue reward configurations (`setQueueConfig`, `getQueueConfig`).
- Enforces multi-stage safety invariants: `DistributionKillSwitch`, `NetworkGuard`, `DistributionGuard`, and internal trigger verification.
- Guarantees idempotent settlement across retries.
- Provides `rewardWithRetry()` with exponential backoff for resilience against transient Horizon downtime.

### 2. `WalletService`
Manages user wallet links and balance queries:
- Validates 56-character Ed25519 public keys (`G...`).
- Generates custodial keypairs (`createAccount()`).
- Establishes and monitors custom asset trustlines.
- Provides cached balance queries with manual and force-refresh invalidation.

### 3. `IncentivePoolClient`
High-level client communicating with the Soroban smart contract:
- `initialize()`: Sets contract administrators, token contract, and emergency pause governance.
- `deposit()`: Funds the contract balance.
- `distribute()`: Submits authorized queue completion reward transactions with deterministic transaction hashes.

---

## Security Safeguards

- **`LogSanitizer`**: Automatically scrubs all 56-character secret seeds (`S...`) from strings, error traces, and nested objects.
- **`SecretsManager`**: Secures distribution keys via in-memory, AWS Secrets Manager, or HashiCorp Vault providers.
- **`MultiSigService`**: Generates and verifies 2-of-3 quorum threshold policies.
- **`DistributionGuard`**: Enforces per-transaction caps (e.g. 50 XLM) and 24-hour rolling volume limits (e.g. 1000 XLM).
- **`DistributionKillSwitch`**: Runtime emergency circuit breaker halting all payouts immediately.
- **`AccountTransactionWatcher`**: Real-time outgoing transfer monitor that trips the kill switch upon rogue transactions.
- **`NetworkGuard`**: Blocks operations on Stellar Public Mainnet unless explicitly authorized with `allowMainnet: true` or `STELLAR_ALLOW_MAINNET="true"`.

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `STELLAR_NETWORK` | `TESTNET` | Network target (`TESTNET`, `MAINNET`, `FUTURENET`, `STANDALONE`). |
| `STELLAR_ALLOW_MAINNET` | `false` | Explicit opt-in required to execute against Public Mainnet. |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | REST API gateway URL for Horizon. |
| `STELLAR_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | RPC endpoint for Soroban contract interaction. |
| `STELLAR_DISTRIBUTION_SECRET_KEY` | *(Required in prod)* | Ed25519 secret seed for backend distribution signer. |
| `STELLAR_INCENTIVE_POOL_CONTRACT_ID` | `CDEFAULT...` | Deployed Soroban IncentivePool contract address. |

---

## Testing & Quality Assurance

Run the test suites from either the workspace root or the package directory:

```bash
# Run all unit, integration, and security regression tests
npm run test -w @qyou/stellar

# Run test coverage and verify threshold floors (Line: 85%, Branch: 80%, Function: 85%)
npm run test:coverage -w @qyou/stellar

# Run property-based transaction mutation testing
npm run test:mutation -w @qyou/stellar

# Run concurrent burst load tests (50 and 100 simultaneous rewards)
npm run test:load -w @qyou/stellar

# Run Soroban Rust contract unit tests
cargo test --manifest-path packages/stellar/contracts/incentive_pool/Cargo.toml
```

# Qyou Stellar Package (`packages/stellar`)

**Version:** 0.1.0  
**Status:** Active Development / Alpha  
**Scope:** Core Stellar smart contract integrations, Soroban bindings, and cryptographic transaction builders for the Qyou ecosystem.

---

## 1. Overview & Purpose
The `packages/stellar` package provides TypeScript and Rust integration layers for interacting with the Stellar network and Soroban smart contracts within the Qyou architecture. It encapsulates account management, transaction signing, Soroban contract invocation helpers, and RPC client wrappers into a modular, testable library.

---

## 2. Current Implementation Status
* **Soroban Contract Bindings:** Initial TypeScript interfaces and invocation wrappers for asset escrow, budget allocation, and spending contracts.
* **RPC & Horizon Integration:** Robust transport layers connecting to Stellar Testnet and Mainnet RPC endpoints with automatic retry logic and error normalization.
* **Key Management & Signing:** Secure local keypair generation, transaction fee bumping, and XDR serialization utilities.

---

## 3. Network Configuration
The package supports dynamic network switching via environment variables or explicit client configuration:
* **Testnet (Default):** Connected to Stellar Futurenet/Testnet RPC (`https://soroban-testnet.stellar.org`).
* **Mainnet:** Production-grade configuration for mainnet deployment (`https://soroban.stellar.org`).
* **Local Sandbox:** Standalone Soroban RPC instance running locally on `http://localhost:8000`.

---

## 4. Relationship to `apps/api`
* **Dependency Direction:** `apps/api` consumes `packages/stellar` as a local workspace dependency to execute on-chain verifications, build transactions, and query Soroban smart contract state.
* **Separation of Concerns:** `packages/stellar` contains zero HTTP routing or Express/FastAPI logic; it strictly handles Stellar protocol interactions, leaving API orchestration and business logic to `apps/api`.