# Qyou Hackathon Starter

Qyou is being rebuilt from scratch as an open source hackathon starter focused on fast iteration, clean contributor onboarding, and a clear MVP path.

This repository now provides a minimal monorepo baseline with:

- `apps/api` - Express API starter
- `apps/web` - Next.js web app starter
- `apps/mobile` - Expo mobile app starter
- `apps/stellar-service` - Stellar integration service starter
- `packages/config` - shared environment/config helpers
- `packages/types` - shared domain and integration types

## Principles

- Treat previous queue-platform code as legacy and out of scope
- Rebuild the MVP from the authentication layer outward
- Keep the repo lightweight, understandable, and contributor-friendly
- Separate public code from local planning and GitHub operations artifacts

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run the starter apps

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
npm run dev:stellar-service
```

### Useful commands

```bash
npm run build
npm run auth:baseline
npm run typecheck
npm run lint
```

## Environment

Copy `.env.example` files from the workspaces you want to run:

- `apps/api/.env.example`
- `apps/web/.env.example`
- `apps/mobile/.env.example`
- `apps/stellar-service/.env.example`

## MVP Roadmap

The rebuild starts with authentication as the first milestone, then expands through the MVP in deliberate slices:

1. Authentication and session foundation
2. User and profile basics
3. Queue/location discovery baseline
4. Reporting and verification flows
5. Stellar-backed rewards and payouts
6. Admin, observability, QA, and launch polish

## Contributing

This repo is intended for public contributors and hackathon teams:

- keep pull requests focused
- prefer incremental, testable changes
- document tradeoffs briefly in PR descriptions
- coordinate larger architecture changes through issues first

Local issue manifests and GitHub publishing helpers are intentionally gitignored so repo-ops work does not pollute the starter codebase.
