# Quarterly Security Review Process: Stellar & Soroban Integration

**Policy Owner**: Head of Security & Blockchain Engineering  
**Cadence**: Quarterly (January, April, July, October)  
**Classification**: Internal Compliance & Security Standard  
**Related Issues**: #75–#88 (Security Tracks 1–6), #1050, #1073  

---

## 1. Purpose & Guiding Principles

Security controls implemented during initial development can silently decay as teams change, dependencies update, and operational practices evolve. This quarterly review process mandates a recurring, auditable inspection of Qyou's blockchain security posture to maintain zero-compromise integrity.

---

## 2. Review Cadence & Ownership

| Quarter | Review Window | Primary Reviewer | Sign-Off Authority |
| :--- | :--- | :--- | :--- |
| **Q1** | January 1 – 15 | Lead Security Engineer | CTO / VP Engineering |
| **Q2** | April 1 – 15 | Blockchain SRE Lead | Head of Security |
| **Q3** | July 1 – 15 | Senior Backend Platform Lead | CTO / VP Engineering |
| **Q4** | October 1 – 15 | Lead Security Engineer | Head of Security & Legal |

---

## 3. The 5 Core Quarterly Audit Pillars

Each quarterly review must execute and record findings across five specific security pillars:

### Pillar 1: Custodial Key Rotation & Hygiene Status
- [ ] **Distribution Key Age**: Verify operational distribution account keys have been rotated within the last 180 days.
- [ ] **Zero Plaintext Audit**: Run automated cryptographic key scan across all Git repositories:
  ```bash
  npm run audit:crypto -w @qyou/stellar
  ```
- [ ] **KMS / Vault Access Audit**: Inspect AWS CloudTrail / HashiCorp Vault logs for unauthorized `GetSecretValue` or `Decrypt` calls during the preceding 90 days.
- [ ] **Log Sanitization Verification**: Confirm `LogSanitizer` remains active in all API error handlers and stdout streams (#1024).

### Pillar 2: Multi-Sig Signer Set & Threshold Topology (#1026)
- [ ] **Active Signer Roster**: Query the on-chain distribution account and Soroban contract admin signers via Horizon.
- [ ] **Offboarding Verification**: Ensure no departed team members retain active signing keys in any multi-sig quorum.
- [ ] **Topology Validation**: Run automated threshold topology check:
  ```bash
  npm run test -w @qyou/stellar -- safeguards.test.ts
  ```
  Confirm weight sum $\ge$ threshold and no single signer has sole authority.

### Pillar 3: Smart Contract Bytecode & Upgrade Admin Currency (#1014)
- [ ] **Wasm Bytecode Integrity**: Compute SHA-256 hash of compiled `contracts/incentive_pool/target/wasm32-unknown-unknown/release/incentive_pool.wasm` and verify it matches on-chain Soroban contract hash.
- [ ] **Upgrade Admin Timelock**: Verify contract upgrade authority is held by multi-sig upgrade admin, not a single private key.
- [ ] **Emergency Admin Authority**: Confirm emergency admin can trigger pause without moving funds.

### Pillar 4: Security Regression & Circuit Breaker Health (#1030, #1050)
- [ ] **Track 6 Regression Suite**: Execute full security controls regression suite:
  ```bash
  npm run test -w @qyou/stellar -- track6-regression.test.ts
  ```
  All 10 security controls must report 100% pass rate.
- [ ] **Kill Switch Drill**: Perform scheduled testnet drill tripping and resetting `DistributionKillSwitch`.
- [ ] **Watcher Non-Interference**: Verify `AccountTransactionWatcher` correctly flags simulated foreign transactions.

### Pillar 5: Stellar SDK Advisories & Ecosystem CVE Review
- [ ] **Dependency Audit**: Run npm vulnerability scan:
  ```bash
  npm audit --workspace=@qyou/stellar --workspace=@qyou/api
  ```
- [ ] **Stellar Advisories**: Review official SDF Security Advisories, Soroban releases, and Core protocol voting proposals.
- [ ] **Horizon/RPC Deprecation**: Verify upstream RPC versions and deprecation notices with node providers (#1068).

---

## 4. Quarterly Audit Sign-Off Template

Following review completion, the team records results in the formal compliance log below:

```markdown
### Quarterly Review Sign-Off: Q[1/2/3/4] [YEAR]

- **Date of Review**: YYYY-MM-DD
- **Reviewers**: [Name 1, Role], [Name 2, Role]
- **Summary of Findings**:
  - Pillar 1 (Key Hygiene): [PASSED / ACTION_REQUIRED]
  - Pillar 2 (Multi-Sig Signers): [PASSED / ACTION_REQUIRED]
  - Pillar 3 (Contract Currency): [PASSED / ACTION_REQUIRED]
  - Pillar 4 (Regression Suite): [PASSED / ACTION_REQUIRED]
  - Pillar 5 (Advisory Scan): [PASSED / ACTION_REQUIRED]
- **Identified Risks / Action Items**:
  1. [Action Item Description] — Owner: [Name] — Due: [Date]
- **Sign-off Approval**:
  - [Name, Title, Signature/Date]
```

---

## 5. Audit History Log

| Quarter | Date Completed | Lead Auditor | Status | Actions Completed |
| :--- | :--- | :--- | :--- | :--- |
| **Q3 2026** | 2026-09-26 | Cornelius Cent | **PASSED** | Initial Track 6 baseline review, smoke tests automated (#1072), fee tracker operational (#1070). |
