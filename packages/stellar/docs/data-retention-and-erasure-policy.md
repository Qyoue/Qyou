# Data Retention & Right-to-Erasure Policy for Stellar Data (#1036)

## 1. Context & Purpose

Qyou provides user authentication, queue management, and on-chain Stellar incentive rewards. Users possess statutory data privacy rights under regulations such as the **General Data Protection Regulation (GDPR Article 17 - Right to Erasure / "Right to be Forgotten")** and the **California Consumer Privacy Act (CCPA)**.

However, the Stellar distributed ledger is by mathematical and cryptographic design **immutable, permanent, and publicly auditable**. Once a transaction (such as a reward distribution or trustline change) is finalized on the Stellar network, no party—including the Qyou engineering team, validators, or the Stellar Development Foundation—can alter, delete, or expunge that record from ledger history.

This document formalizes the boundary between erasable off-chain data and permanent on-chain data, details the account deletion and wallet unlinking lifecycle, and defines the mandatory disclosure requirements presented to users.

---

## 2. Architecture: Off-Chain vs. On-Chain Boundary

| Category | Storage Location | Contains PII? | Erasable Upon Request? | Erasure Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **User Identity & Auth** | PostgreSQL (`users`, `sessions`) | Yes (Email, Name, Auth tokens) | **Yes** | Hard delete / cascading foreign key removal |
| **Wallet Linkage Association** | PostgreSQL (`stellar_wallets`) | Pseudonymous (User ID ↔ Public Key) | **Yes** | Record deleted; association severed |
| **Balance Caches** | Redis / In-Memory | No | **Yes** | Invalidation / key purge |
| **Off-Chain Notification History** | PostgreSQL / Redis | Pseudonymous | **Yes** | Anonymized or purged after 30 days |
| **Stellar Transaction Ledger** | Stellar Network Ledgers / Horizon | Public Pseudonymous (G-address, stroop amounts) | **NO (Technically impossible)** | Permanently retained on global validator network |
| **Soroban Smart Contract State** | Soroban Contract Storage | Public Contract State (idempotency hashes) | **NO** | Subject to Soroban TTL / state archival |

---

## 3. Account Unlinking & Deletion Lifecycle

When a user requests wallet unlinking or full account deletion:

### 3.1 Wallet Unlink (`DELETE /api/stellar/wallet`)
1. The user's `userId` ↔ `publicKey` association in `stellar_wallets` is immediately deleted.
2. Cached balance entries for that public key are purged from memory (`WalletService.invalidateBalanceCache()`).
3. Future queue completions by that user will **not** attempt to distribute rewards to that public key.
4. Past completed reward records in internal analytics are disassociated from the user's profile.

### 3.2 Full Account Erasure
1. User profile data (email, names, passwords/credentials) is wiped from the database.
2. The user's internal ID is replaced with an anonymous hash in audit logs.
3. **On-Chain Residuals**: The Stellar blockchain will forever retain that a transaction of `X` XLM was sent from the Qyou distribution account to address `G...`. Because Qyou has purged the mapping connecting `G...` to the user's real-world identity, the on-chain data reverts to pure pseudonymity.

---

## 4. Mandatory User Disclosures

To satisfy regulatory and ethical transparency standards, Qyou mandates two explicit user disclosures in the user interface:

### 4.1 Onboarding / Wallet Linking Modal Disclosure
*Presented prior to submitting a public key or wallet challenge signature:*
> **Blockchain Notice**: Linking your Stellar wallet allows you to receive rewards directly on-chain. Please note that transactions executed on the Stellar blockchain are public and permanent. While you can unlink your wallet from Qyou at any time, past transactions recorded on the Stellar ledger cannot be deleted or altered by Qyou.

### 4.2 Account Deletion Confirmation Dialog
*Presented before finalizing account deletion:*
> **Permanent Blockchain Records**: Deleting your Qyou account will permanently remove your personal profile and unlink your wallet from our servers. However, any reward distributions previously sent to your Stellar address are permanently recorded on the decentralized Stellar blockchain and cannot be erased.

---

## 5. Security & Operational Log Retention

Internal operational and security logs are maintained according to strict retention windows:

| Log Type | Retention Window | Storage Encryption | Purpose |
| :--- | :--- | :--- | :--- |
| **Audit Logs (Unlink / Link events)** | 90 days | AES-256 at rest | Security audit and abuse monitoring |
| **Kill Switch State Transitions** | 1 year | Encrypted DB | Incident post-mortem & compliance |
| **Transaction Watcher Alerts** | 180 days | Encrypted DB | Anomaly analysis & forensic defense |
| **Temporary Signature Nonces** | 15 minutes (or on use) | In-Memory / TTL Redis | Replay protection (#1035) |

After their retention window expires, operational logs are automatically purged by scheduled rotation workers.
