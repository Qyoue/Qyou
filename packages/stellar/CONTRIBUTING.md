# Contributing to `@qyou/stellar`

This guide outlines security practices, environment configuration, and testing requirements specifically for the `@qyou/stellar` package and any code touching Stellar/Soroban blockchain operations.

---

## 1. Blockchain Key Hygiene & Secret Management

Working with blockchain components introduces unique cryptographic and financial risks. Strict security standards apply to all contributors:

### Secret Seed Protection
- **Never commit secret keys**: Stellar secret seeds start with the letter `S` and are 56 characters long (Base32 StrKey). Never commit, hardcode, or check in any secret key to version control—even testnet seeds.
- **Never commit seeds holding value**: If a testnet key has been funded on Friendbot or has test tokens, treat it with caution; never expose credentials used across environments.
- **Environment Variables**: Always load operational keys via environment variables (e.g. `STELLAR_DISTRIBUTION_SECRET_KEY`, `STELLAR_ADMIN_SIGNER_KEY`).
- **Local Development Secrets**: Use `.env.local` or environment exports. Ensure `.env.local` remains in `.gitignore`.
- **Log Sanitization**: Never pass unmasked secret keys to loggers, error handlers, or telemetry. Always pass outputs through `@qyou/stellar`'s `LogSanitizer` before emitting logs.
- **Crypto Auditing**: Run `npm run audit:crypto -w @qyou/stellar` before submitting pull requests to ensure no hardcoded private keys or insecure cryptographic primitives exist in code.

---

## 2. Testnet-Only Defaults

All local development and continuous integration environments must strictly default to the **Stellar Testnet**:

- **Network Passphrase**:
  Default passphrase is `'Test SDF Network ; September 2015'`.
- **Horizon & Soroban RPC URLs**:
  - Horizon: `https://horizon-testnet.stellar.org`
  - Soroban RPC: `https://soroban-testnet.stellar.org`
- **Network Guardrails**:
  The `NetworkGuard` safety utility strictly enforces testnet execution. Any attempt to invoke contract methods, reward distributions, or horizon submissions against Public Global Mainnet without explicit `allowMainnet: true` will throw a `MainnetSafetyError`.
- **Local Testing**:
  When testing services, use in-memory simulators (`IncentivePoolContract` mock harness) or testnet Friendbot-funded accounts.

---

## 3. Pre-PR Verification Commands

Before opening a pull request touching `@qyou/stellar` or the Stellar API module in `apps/api`:

```bash
# 1. Typecheck the workspace
npm run typecheck -w @qyou/stellar

# 2. Run unit and integration tests
npm run test -w @qyou/stellar

# 3. Check coverage thresholds (85% lines, 80% branches, 85% functions)
npm run test:coverage -w @qyou/stellar

# 4. Run mutation testing suite (mutant kill score)
npm run test:mutation -w @qyou/stellar

# 5. Run crypto hygiene audit
npm run audit:crypto -w @qyou/stellar

# 6. Verify full package build
npm run build -w @qyou/stellar
```

---

## 4. Architecture Conventions

- **Services**: Keep blockchain business logic inside `packages/stellar/src/services/` (`WalletService`, `IncentiveService`).
- **Security**: Security checks (kill switch, rate limits, network guards, transaction watchers) must be executed before on-chain transactions are dispatched.
- **Idempotency**: All payout operations must accept and enforce an idempotency key to prevent double-spending on network retries.
- **Errors**: Inherit from `StellarError` or `ContractError` defined in `packages/stellar/src/errors/` to maintain structured error reporting across apps.
