# Qyou — Hackathon Starter

This repository is the **foundation monorepo** for the Qyou hackathon. It contains the project's
monorepo setup, tooling, and authentication functionality only. It is intended to be a stable,
documented, tested starting point that participants can immediately build on.

---

## Project Vision

**Qyou** is a real-time queueing and location-based coordination platform designed to help people
discover, join, and track queues and service flows in physical and digital spaces.

The platform focuses on reducing friction in environments where users typically wait, request
services, or compete for limited access — such as events, service centers, community access
points, or shared public workflows.

Qyou combines mobile-first queue interactions, web-based management tools, and Stellar-powered
incentives to create a transparent and efficient system for managing participation and access.

### Overview

Many real-world systems rely on queues, waitlists, and informal tracking methods that are often
opaque, inefficient, or disconnected from user visibility.

Qyou introduces a structured system where:

* users can discover and join queues in real time,
* queue status is visible and trackable,
* operators can manage flow and capacity,
* participation is recorded and verifiable,
* incentives can be attached to queue participation using Stellar.

The goal is to make queue-based systems more transparent, fair, and measurable.

### System Principles

Qyou is built around a few core principles:

* queues should be visible, not hidden
* participation should be trackable and fair
* operators and users should share the same source of truth
* systems should scale from simple queues to complex workflows
* blockchain elements should remain optional and non-intrusive

---

## What's in this Foundation

Only the following are implemented in this repository:

1. Monorepo setup and shared tooling
2. Authentication backend (Express modular monolith)
3. Authentication web frontend (Next.js)
4. React Native project foundation (no auth, no screens)
5. Stellar package scaffold (no blockchain logic)
6. Shared package (validation schemas and types)
7. Automated tests
8. CI/CD via GitHub Actions

Everything else described in the project vision above (queue discovery, operator dashboards,
Stellar incentive flows, etc.) is **future work** and intentionally not implemented here. The
architecture, package boundaries, and naming conventions in this repository are chosen so that
those features can be added later without restructuring.

---

## Monorepo Layout

```text
.
├── apps/
│   ├── api/        # Express modular monolith — authentication API
│   ├── web/        # Next.js — login & create-account pages
│   └── mobile/     # Expo + React Native — project foundation only
├── packages/
│   ├── shared/     # Shared validation schemas and auth types
│   └── stellar/    # Stellar package scaffold (placeholder types only)
├── docs/           # Setup, testing, and contributor documentation
└── .github/
    └── workflows/  # Per-package CI pipelines
```

## Package Responsibilities

| Package             | Responsibility                                                        |
| ------------------- | ---------------------------------------------------------------------- |
| `apps/api`          | Authentication API (register/login) as a modular monolith              |
| `apps/web`          | Login and create-account pages, auth state management                  |
| `apps/mobile`       | React Native project foundation (folders, tooling, no features yet)    |
| `packages/shared`   | Shared validation schemas (zod) and auth-related TypeScript types      |
| `packages/stellar`  | Scaffold for the future Stellar integration package                    |

---

## Local Development Setup

### Requirements

* Node.js 20+
* npm 10+

### Install dependencies

```bash
npm install
```

### Environment variables

Each app has a `.env.example` file documenting the variables it needs. Copy it to `.env` (or
`.env.local` for `apps/web`) and fill in values before running that app. See
[`docs/SETUP.md`](docs/SETUP.md) for details.

---

## Running Applications

```bash
# Run everything (api + web + mobile) concurrently
npm run dev

# Or run a single app
npm run dev -w @qyou/api
npm run dev -w @qyou/web
npm run dev -w @qyou/mobile
```

---

## Running Tests

```bash
# Run tests for every workspace
npm run test

# Or run tests for a single workspace
npm run test -w @qyou/api
npm run test -w @qyou/web
npm run test -w @qyou/mobile
```

See [`docs/TESTING.md`](docs/TESTING.md) for what each test suite covers and what CI runs.

---

## Other Useful Commands

```bash
npm run lint       # Lint every workspace
npm run typecheck  # Type-check every workspace
npm run format     # Format the repo with Prettier
npm run build      # Build every workspace
```

---

## Documentation

* [`docs/SETUP.md`](docs/SETUP.md) — environment variables, local configuration, secrets handling
* [`docs/TESTING.md`](docs/TESTING.md) — test execution, structure, and CI expectations
* [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — coding standards, project structure, workflow

---

## License

MIT
