# Stellar Ecosystem Glossary

This document provides definitions and context for Stellar-specific and Soroban concepts used throughout the Qyou codebase and documentation. It is designed for developers new to the Stellar ecosystem.

For the system architecture, see [Stellar Architecture Overview](./stellar-architecture.md).

---

## Core Concepts

### Account
An entity recorded on the Stellar ledger identified by an **Ed25519 public key**. Accounts hold native lumens (XLM), custom asset balances, trustlines, signers, and contract data.

### Ed25519 Keypair
Stellar utilizes Ed25519 public-key cryptography:
- **Public Key (G-Address)**: 56 characters long, formatted in RFC 4648 Base32, beginning with `G` (e.g. `GBRPYHIL2CI3...`). Safe to share publicly and store in user profiles.
- **Secret Seed (S-Address)**: 56 characters long, beginning with `S` (e.g. `SBRPYHIL2CI3...`). Grants full control over the account. Must **never** be checked into version control, output in log streams, or exposed to the frontend.

### XLM (Lumens) and Stroop
- **XLM (Lumens)**: The native network token of the Stellar blockchain, used to pay network fees and satisfy ledger balance reserves.
- **Stroop**: The smallest atomic unit of XLM. 
  $$\text{1 XLM} = 10{,}000{,}000 \text{ stroops } (10^7)$$
  All internal calculations in `@qyou/stellar` are represented as `bigint` stroops to eliminate floating-point precision loss.

### Base Reserve & Minimum Balance
To prevent ledger spam, every Stellar account must maintain a minimum XLM balance. The base reserve (currently 0.5 XLM on testnet and mainnet) dictates this floor:
$$\text{Minimum Balance} = (2 + \text{Number of Subentries}) \times \text{Base Reserve}$$
Subentries include trustlines, additional signers, and open offers.

### Trustline
An explicit declaration of trust on the Stellar ledger permitting an account to hold a specific non-native asset issued by a designated issuer account. Without an active trustline, an account cannot receive custom tokens.

### Sequence Number
A 64-bit integer associated with each Stellar account that increments by 1 with every successful transaction. Transactions submitted with an out-of-order sequence number are rejected by the network, preventing transaction replay attacks.

---

## Infrastructure & Smart Contracts

### Horizon
The standard REST API gateway for the Stellar ecosystem. Horizon ingests ledger states from `stellar-core` nodes and exposes HTTP endpoints to query account balances, payment history, transaction results, and submit signed transaction envelopes.

### Soroban
Stellar's smart contract platform built on WebAssembly (WASM) and Rust. Contracts on Soroban run deterministically, feature state archiving and time-to-live (TTL) expiration, and support cross-contract calls. In Qyou, the `IncentivePool` contract manages queue reward funds.

### Friendbot
An automated testnet faucet maintained by the Stellar Development Foundation (SDF) and local Quickstart instances. Querying `https://friendbot.stellar.org/?addr=<PUBLIC_KEY>` instantly creates and funds a testnet account with 10,000 XLM for testing.

### Stellar Expert
A public blockchain explorer for the Stellar network (testnet and mainnet) used to inspect accounts, transactions, operations, and contract invocations.

---

## Qyou Architecture Terminology

### Idempotency Key
A unique deterministic key (e.g., `qreward:<userId>:<queueId>:<attempt>`) attached to every incentive reward request. The `IncentiveService` and `IncentivePoolClient` ensure that duplicated or retransmitted HTTP requests return the original transaction hash rather than creating duplicate on-chain payouts.

### Distribution Kill Switch
A centralized, runtime-toggleable circuit breaker (`DistributionKillSwitch`) that halts all automated queue payouts in real time if abnormal network activity, balance drain, or security anomalies are detected.

### Account Transaction Watcher
An asynchronous monitor (`AccountTransactionWatcher`) that tracks outgoing operations on the custodial distribution account. If a transaction appears that was not pre-authorized by `IncentiveService`, the watcher emits an alert and automatically trips the kill switch.

### Multi-Sig (Multi-Signature)
An account security topology where operations require threshold signatures from multiple independent keys (e.g. 2-of-3 threshold). In Qyou, this separates daily automated worker signing from emergency cold recovery keys.

### Network Guard
A safety boundary (`NetworkGuard`) that blocks execution against the Stellar Public Mainnet unless the process has explicitly opted in with `allowMainnet: true` or `STELLAR_ALLOW_MAINNET="true"`.
