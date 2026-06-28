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
