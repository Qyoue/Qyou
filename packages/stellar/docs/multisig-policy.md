# Stellar Distribution Multi-Signature Policy & Signer Quorum (#1026)

## Purpose & Architecture

To prevent a single compromised API key or backend host from draining incentive funds, the Qyou production distribution account enforces Stellar's native multi-signature thresholds.

---

## Signer Set & Weight Assignments

| Signer Role | Public Key Storage | Key Custody | Weight |
|:---|:---|:---|:---:|
| **Automated Worker (Master)** | AWS Secrets Manager / KMS | Dynamic task container credential | 1 |
| **Security Sidecar Validator** | HSM / Cloud KMS | Independent anomaly validation service | 1 |
| **Cold Recovery Admin** | Hardware Security Module (Air-gapped) | Engineering Security Committee | 1 |

---

## Threshold Matrix

Stellar transactions categorize operations into Low, Medium, and High thresholds:

| Threshold Level | Value | Required Weight | Operations Covered |
|:---|:---:|:---:|:---|
| **Low Threshold** | 1 | 1 | `AllowTrust`, `BumpSequence` (routine maintenance) |
| **Medium Threshold** | 2 | 2 | `Payment`, Soroban Contract `invoke_contract_function` (`distribute`) |
| **High Threshold** | 3 | 3 | `SetOptions` (altering thresholds, adding/removing signers), account merge |

### Operating Quorum Rules
1. **Automated Distributions (Weight = 2)**: Both the backend worker and the security sidecar must independently validate queue completion before co-signing the distribution transaction.
2. **Account Administrative Changes (Weight = 3)**: Requires all three signers, including physical authorization from the cold recovery admin key.
