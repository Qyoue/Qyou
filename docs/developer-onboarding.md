# Developer Onboarding

This document provides the onboarding workflow for new developers joining the Qyou monorepo.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (for `@qyou/api`)
- Expo CLI (for `@qyou/mobile`)

## First-time setup

```bash
# 1. Clone and install
git clone https://github.com/Qyoue/Qyou.git
cd Qyou
npm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
# Edit .env files with local credentials

# 3. Run database migrations (api workspace)
npm run build -w @qyou/shared
npm run db:migrate -w @qyou/api

# 4. Verify everything works
npm run lint
npm run typecheck
npm run test
```

## Project structure

```
Qyou/
├── apps/
│   ├── api/          # Express + Prisma backend
│   ├── web/          # Next.js frontend
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── shared/       # Zod schemas, shared logic
│   └── stellar/      # Stellar/Soroban blockchain integration
├── scripts/          # Monorepo validation and tooling
├── docs/             # Documentation
└── .github/workflows # CI pipeline
```

## Stellar & Soroban Local Setup (#1052)

Qyou features a native Stellar blockchain and Soroban smart contract integration in `packages/stellar`. For deep architectural context, see the [Stellar Architecture Overview](./stellar-architecture.md) and the [Stellar Glossary](./stellar-glossary.md).

### 1. Prerequisites (Optional for Smart Contract Compilation)
- **Rust toolchain** (1.81+) with `wasm32-unknown-unknown` target (required only if modifying contracts):
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- **Stellar CLI** (v22+):
  ```bash
  cargo install --locked stellar-cli --features opt
  ```

### 2. Environment Configuration
Add the following Stellar environment variables to `apps/api/.env`:

```env
STELLAR_NETWORK=TESTNET
STELLAR_ALLOW_MAINNET=false
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_DISTRIBUTION_PUBLIC_KEY=GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU
STELLAR_DISTRIBUTION_SECRET_KEY=SBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU
STELLAR_INCENTIVE_POOL_CONTRACT_ID=CDEFAULTTESTNETCONTRACTID1234567890
STELLAR_INCENTIVES_ENABLED=true
```

> [!WARNING]
> Never commit real secret keys (`S...`) to version control. `@qyou/stellar` includes automatic `LogSanitizer` and `NetworkGuard` defenses to prevent credential leaks and accidental mainnet operations.

### 3. Funding Test Accounts with Friendbot
To create and fund an account on Stellar Testnet with 10,000 free test XLM:
```bash
# 1. Generate a keypair using Stellar CLI (or through @qyou/stellar WalletService)
stellar keys generate dev-account --network testnet

# 2. Fund via SDF Friendbot
curl "https://friendbot.stellar.org/?addr=$(stellar keys address dev-account)"
```

### 4. Running Stellar-Specific Tests
Verify your Stellar environment by running the test suite:

```bash
# Run all Stellar package tests (134+ tests covering unit, security regression, and contracts)
npm run test -w @qyou/stellar

# Run test coverage verification (enforces Line >= 85%, Branch >= 80%, Function >= 85%)
npm run test:coverage -w @qyou/stellar

# Run property-based transaction mutation testing
npm run test:mutation -w @qyou/stellar

# Run concurrent load performance testing (50 and 100 simultaneous queue rewards)
npm run test:load -w @qyou/stellar

# Run Rust Soroban smart contract tests
cargo test --manifest-path packages/stellar/contracts/incentive_pool/Cargo.toml
```

## Daily workflow

```bash
# Start all dev servers
npm run dev

# Check code quality
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Tests

# Build for production
npm run build
```

## Troubleshooting

- `npm run build` fails: ensure `@qyou/shared` builds first via `npm run build -w @qyou/shared`
- Database errors: verify `DATABASE_URL` in `apps/api/.env`
- Type errors after pull: run `npm run typecheck` to identify failures
