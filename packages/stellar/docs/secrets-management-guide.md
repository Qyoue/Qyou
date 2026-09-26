# Secrets Management Runbook & Configuration Guide (#1025)

## Production Key Custody

In production environments, private keys capable of signing financial distributions (`STELLAR_DISTRIBUTION_SECRET_KEY`) or authorizing contract upgrades (`STELLAR_UPGRADE_ADMIN_KEY`) must **never** be stored in plaintext `.env` files, committed to source control, or logged.

### Supported Secret Stores

The `@qyou/stellar` package provides `SecretsManager` supporting:

1. **AWS Secrets Manager**
   - Secret ARN: `arn:aws:secretsmanager:us-east-1:<account>:secret:qyou/stellar/production-keys`
   - Key Names:
     - `STELLAR_DISTRIBUTION_SECRET_KEY`
     - `STELLAR_UPGRADE_ADMIN_KEY`
   - Automatic rotation policy: 90 days.
   - IAM Policy: Grant least privilege `secretsmanager:GetSecretValue` only to the backend ECS task execution role.

2. **HashiCorp Vault**
   - Mount Path: `secret/data/qyou/stellar/`
   - Access: Authenticated via Kubernetes ServiceAccount or AppRole.

---

## Local Development & Testnet Fallback

For local development and continuous integration:

- **Throwaway Testnet Accounts**: Developers must use Friendbot-funded testnet keypairs.
- **Dry-Run & Simulated Execution**: In unit tests, `InMemorySecretsProvider` or simulated clients are used without requiring network calls or persistent key storage.
- **Pre-commit Guards**: Git pre-commit hooks and CI linters scan for secret seed patterns (`S[A-Z2-7]{55}`) to block accidental commits.
