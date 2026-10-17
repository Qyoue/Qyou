# Stellar Custodial Key Material: Backup & Disaster Recovery Plan

**Classification**: Confidential — Internal Security Policy  
**Scope**: `@qyou/stellar`, Distribution Pool Keypairs, Soroban Contract Admin Keys  
**Related Issues**: #10, #84, #1069  
**Review Cycle**: Semi-Annual  

---

## 1. Objective & Security Invariant

This policy defines the backup, redundancy, and disaster recovery processes for all custodial cryptographic key material managed by Qyou.

### Non-Negotiable Invariants
1. **Zero Plaintext Backups**: Key material (Ed25519 secret seeds starting with `S...`) must **NEVER** be exported, backed up, or stored in unencrypted plaintext on disk, in email, paper notes, or communication channels.
2. **Dual-Control / Threshold Quorum**: No single individual can unilaterally recover, reconstruct, or exfiltrate production custodial secret keys.
3. **Immutability of Ledger Audit Trails**: Key recovery operations must be logged with cryptographic nonces and tamper-evident audit trails.

---

## 2. Threat & Risk Model

| Threat Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Cloud Region Catastrophic Destruction** | Complete loss of primary KMS & DB storage | Multi-region KMS envelope replication + off-site encrypted shards. |
| **Accidental Secret Deletion in Vault** | Loss of distribution account access | Soft-delete retention (30 days) + Shamir's Secret Sharing (SSS) disaster backup. |
| **Insider Rogue Exfiltration** | Unauthorized fund draining | 3-of-5 Shamir threshold quorum + HSM hardware protection. |
| **Key Compromise via Breach** | Active unauthorized transaction dispatch | Automated kill switch (#1030) + rapid admin rotation runbook. |

---

## 3. Cryptographic Backup Architecture

```text
[ Raw Key Material (S...) ]
            │
            ▼ (Envelope Encryption via AES-256-GCM)
┌──────────────────────────────────────────────────────────┐
│  Primary Production Storage (AWS Secrets Manager / KMS)  │
│  - Multi-Region Replication (us-east-1 <-> eu-west-1)    │
│  - CloudTrail Auditing + IAM Least-Privilege Role        │
└──────────────────────────────────────────────────────────┘
            │
            ▼ (Cold Disaster Recovery: Shamir's Secret Sharing)
┌──────────────────────────────────────────────────────────┐
│       Threshold Scheme: 3-of-5 Custodian Shards          │
│  - Shard 1: Head of Engineering (PGP Encrypted / YubiKey)│
│  - Shard 2: Lead Security Engineer (Hardware Token)      │
│  - Shard 3: Infrastructure / SRE Lead                    │
│  - Shard 4: VP of Engineering / CTO                      │
│  - Shard 5: Legal & Compliance Custodian                 │
└──────────────────────────────────────────────────────────┘
```

### 3.1 Envelope Encryption
- Master Key (MEK) resides inside FIPS 140-2 Level 3 Hardware Security Module (HSM).
- Data Encryption Keys (DEKs) encrypt the `S...` secret seeds using AES-256-GCM with unique 96-bit initialization vectors (IVs).
- Encrypted payloads include HMAC integrity verification.

### 3.2 Threshold Backup (Shamir's 3-of-5 Scheme)
- A separate cold disaster recovery seed is partitioned into **5 cryptographic polynomial shares** using Shamir's Secret Sharing.
- Any **3 of the 5 shares** are required to reconstruct the recovery key.
- Each share is individually encrypted with the designated custodian's GPG public key and stored on an offline, air-gapped FIPS hardware token.

---

## 4. Disaster Recovery & Reconstruction Procedure

If production secret keys are lost or rendered inaccessible in AWS KMS / HashiCorp Vault:

### Phase 1: Incident Declaration & Quorum Assembly
1. The Incident Commander declares a **P1 Disaster Recovery Event**.
2. Convene a secure recovery quorum consisting of at least 3 of the 5 designated key custodians.
3. Verify each custodian's identity via out-of-band video and biometric authentication.

### Phase 2: Air-Gapped Reconstruction
1. Prepare an air-gapped recovery laptop (disconnected from all networks, booted from a clean cryptographic live OS image).
2. The 3 participating custodians decrypt their respective shards into the air-gapped environment.
3. Execute the reconstruction utility:
   ```bash
   node scripts/dr-reconstruct-shard.js --shards shard1.enc,shard2.enc,shard3.enc
   ```
4. Verify the reconstructed public key matches the on-chain distribution account address:
   ```bash
   node scripts/verify-strkey.js --public $RECONSTRUCTED_PUBLIC_KEY
   ```

### Phase 3: Immediate Key Rotation & Contract Admin Migration
To eliminate risk from exposing the recovered key:
1. **Never put the recovered key back into automated production systems**.
2. Immediately generate a brand-new production keypair in the primary KMS.
3. Sign an on-chain admin transfer transaction using the recovered key:
   - For Soroban contracts: Invoke `IncentivePoolContract.set_admin(newAdminAddress)`.
   - Transfer remaining XLM balance from old distribution account to the new distribution account.
4. Securely wipe the air-gapped reconstruction laptop memory using DoD 5220.22-M sanitation.

### Phase 4: Verification & Audit
1. Run the payment reconciliation job:
   ```bash
   npm run stellar:reconcile -w @qyou/stellar
   ```
2. Verify all queue reward payouts resume successfully with the new keypair.
3. Publish an internal Incident Post-Mortem documenting the recovery timeline and quorum participants.
