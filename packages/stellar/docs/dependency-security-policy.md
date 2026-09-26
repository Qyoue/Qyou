# Stellar SDK & Cryptographic Dependency Security Policy (#1033)

## 1. Purpose & Scope

Cryptographic libraries and blockchain client SDKs (including `@stellar/stellar-sdk`, `@stellar/stellar-base`, `soroban-client`, `tweetnacl`, and `@noble/*`) handle mission-critical key management, transaction signing, and value transfer. Vulnerabilities in these components cannot be treated with standard application-level SLAs.

This policy mandates strict version pinning, subresource integrity verification, and aggressive vulnerability alerting for all cryptographic dependencies in the Qyou monorepo.

---

## 2. In-Scope Dependencies

The following package patterns are classified as **Tier-1 Cryptographic Primitives**:
- `@stellar/stellar-sdk`
- `@stellar/stellar-base`
- `soroban-client`
- `tweetnacl`
- `@noble/*` (e.g. `@noble/hashes`, `@noble/curves`)
- `ed25519-hd-key` / `ed25519`
- `libsodium` / `sodium-native`
- `crypto-js`

---

## 3. Strict Pinning & Lockfile Policy

1. **No Wildcard / Open Ranges**:
   - Caret (`^`) and tilde (`~`) ranges are forbidden for Tier-1 crypto packages in production distributions.
   - Pinned exact versions (e.g., `"13.0.0"`) or strictly reviewed bounds must be used.
2. **Subresource Integrity (SRI)**:
   - All entries in `package-lock.json` must contain a verified `integrity` SHA-512 checksum.
   - Pull requests introducing unhashed or modified registry URLs will be automatically blocked by CI.
3. **Registry Source Verification**:
   - Only official npm registry artifacts signed by verified package maintainers are permitted.
   - Self-hosted or third-party git repository URLs are prohibited for cryptographic modules.

---

## 4. Aggressive Vulnerability SLAs

Standard web dependencies follow normal weekly or bi-weekly patching cadence. Cryptographic dependencies adhere to the following **Zero-Tolerance SLAs**:

| CVE / Advisory Severity | Maximum Remediation Time | Action Required |
| :--- | :--- | :--- |
| **CRITICAL** | **24 hours** | Immediate emergency patch / hotfix deployment or activate kill switch (#1030). |
| **HIGH** | **48 hours** | Hotfix PR with priority peer review and expedited deployment. |
| **MODERATE** | **7 calendar days** | Scheduled dependency upgrade with automated regression testing. |
| **LOW** | **14 calendar days** | Routine upgrade pass. |

---

## 5. Automated Scanning & Tooling

### 5.1 Local & Pre-commit Verification
Run the dedicated crypto dependency audit script:
```bash
npm run audit:crypto -w @qyou/stellar
```

The script evaluates:
- Presence of any known vulnerable version baselines.
- Absence of wildcard ranges.
- SRI hash integrity across all resolved crypto packages in `package-lock.json`.
- Exit code `1` triggers failure if any Tier-1 package violates policy.

### 5.2 CI Pipeline Integration
In GitHub Actions (`.github/workflows/`), the cryptographic audit job runs on every pull request and on a daily scheduled cron (`0 2 * * *`):
```yaml
- name: Run Stellar Crypto Dependency Audit
  run: npm run audit:crypto -w @qyou/stellar
```

---

## 6. Upgrade Review Protocol

Upgrading any Tier-1 cryptographic dependency requires:
1. Two independent peer reviews by Stellar engineers.
2. Review of the upstream changelog and git commit diff for suspicious changes or supply-chain compromises.
3. Full test suite execution including Soroban contract edge cases and E2E lifecycle tests:
   ```bash
   npm run test -w @qyou/stellar
   ```
4. Deployment to staging/testnet with live transaction submission verification prior to production release.
